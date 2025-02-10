import {onMounted, reactive} from 'vue';
import {clearData, getData, removeData, saveData} from './utils/indexedDB';

interface SyncData {
    [key: string]: any;
}

interface UseOfflineSyncOptions {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    bulkSync?: boolean;
    uniqueKeys?: string[];
}

interface SyncState {
    isOnline: boolean;
    offlineData: SyncData[];
    isSyncInProgress: boolean;
}

export function useOfflineSync(options: UseOfflineSyncOptions) {
    const keyPath: string = 'syncId';
    const channel = new BroadcastChannel('vue-offline-sync');

    const state: SyncState = reactive({
        isOnline: navigator.onLine,
        offlineData: [],
        isSyncInProgress: false,
    });

    const fetchOfflineData = async () => {
        state.offlineData = await getData();
    };

    const syncOfflineData = async () => {
        if (!state.isOnline || state.offlineData.length === 0) return;

        try {
            if (options.bulkSync) {
                await applyBulkSync();
            } else {
                await individualSync();
            }
        } catch (error) {
            console.error('[vue-offline-sync] Network error during sync:', error);
        }

        // Notify other tabs that a sync occurred.
        channel.postMessage({ type: 'synced' });

        // Refresh offline data after syncing
        await fetchOfflineData();
    };

    const saveOfflineData = async (data: SyncData) => {
        if (state.isOnline) {
            state.isSyncInProgress = true;
            try {
                const {[keyPath]: _, ...rest} = data;
                await fetch(options.url, {
                    method: options.method || 'POST',
                    body: JSON.stringify(rest),
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers,
                    },
                });
            } catch (error) {
                console.error('[vue-offline-sync] Network error while syncing:', error);
            } finally {
                state.isSyncInProgress = false;
            }
        } else {
            if (options.uniqueKeys && options.uniqueKeys.length > 0) {
                const existingData = await getData()
                const isDuplicate = existingData.some((entry: SyncData) =>
                    options.uniqueKeys.some(key => entry[key] === data[key])
                )

                if (isDuplicate) {
                    console.warn('[vue-offline-sync] Duplicate entry detected. Skipping insert: ', data);
                    return;
                }
            }

            await saveData(data);
            await fetchOfflineData();

            // Notify other tabs that new data was saved.
            channel.postMessage({ type: 'new-data' });
        }
    };

    const applyBulkSync = async (): Promise<void> => {
        if (state.offlineData.length === 0) return;

        const dataToSync = state.offlineData.map(({[keyPath]: _, ...rest}) => rest);
        const response = await fetch(options.url, {
            method: options.method || 'POST',
            body: JSON.stringify(dataToSync),
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            console.error(`[vue-offline-sync] Bulk sync failed with status: ${response.status}`);
            return;
        }

        await clearData();
    };

    const individualSync = async () => {
        for (const data of state.offlineData) {
            const {[keyPath]: _, ...payload} = data;

            const response = await fetch(options.url, {
                method: options.method || 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                console.error(`[vue-offline-sync] Sync failed with status: ${response.status}`);
                continue;
            }

            await removeData(data[keyPath]);
        }
    };

    onMounted(async () => {
        window.addEventListener('online', async () => {
            state.isOnline = true;
            state.isSyncInProgress = true;
            await syncOfflineData();
            state.isSyncInProgress = false;
        });

        window.addEventListener('offline', async () => {
            state.isOnline = false;
        });

        // Listen for updates from other tabs
        channel.addEventListener('message', async (event) => {
            if (event.data.type === 'synced' || event.data.type === 'new-data') {
                console.log('[vue-offline-sync] Sync event received from another tab, reloading offline data...');
                await fetchOfflineData();
            }
        });

        await fetchOfflineData();
    });

    return {
        state,
        saveOfflineData,
        syncOfflineData,
    };
}
