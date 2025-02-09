import {onMounted, reactive} from 'vue';
import {clearData, getData, removeData, saveData, setKeyPath} from './utils/indexedDB';

interface SyncData {
    [key: string]: any;
}

interface RetryPolicy {
    maxAttempts: number;
    delayMs: number;
}

interface UseOfflineSyncOptions {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    keyPath?: string;
    bulkSync?: boolean;
    uniqueKeys?: string[];
    retryPolicy?: RetryPolicy;
}

interface SyncState {
    isOnline: boolean;
    offlineData: SyncData[];
    isSyncInProgress: boolean;
}

export function useOfflineSync(options: UseOfflineSyncOptions): {
    state: SyncState,
    saveOfflineData: (data: SyncData) => Promise<void>,
    syncOfflineData: () => Promise<void>
} {
    const channel: BroadcastChannel = new BroadcastChannel('vue-offline-sync');

    const state: SyncState = reactive({
        isOnline: navigator.onLine,
        offlineData: [],
        isSyncInProgress: false,
    });

    setKeyPath(options.keyPath || 'id');

    const fetchOfflineData = async (): Promise<void> => {
        state.offlineData = await getData();
    };

    const retry = async (fn: () => Promise<Response>, attempt = 1): Promise<Response | null> => {
        try {
            return await fn();
        } catch (error) {
            if (attempt >= (options.retryPolicy?.maxAttempts || 3)) {
                console.error('[vue-offline-sync] Max retry attempts reached.')
                return null;
            }

            console.warn(`[vue-offline-sync] Retrying... (${attempt})`);
            await new Promise(res => setTimeout(res, options.retryPolicy?.delayMs || 1000));
            return retry(fn, attempt + 1);
        }
    }

    const syncOfflineData = async (): Promise<void> => {
        if (!state.isOnline || state.offlineData.length === 0) return;

        try {
            if (options.bulkSync) {
                await applyBulkSync();
            } else {
                await applyIndividualSync();
            }
        } catch (error) {
            console.error('[vue-offline-sync] Network error during sync:', error);
        }

        // Notify other tabs that a sync occurred.
        channel.postMessage({type: 'synced'});
        await fetchOfflineData();
    };

    const saveOfflineData = async (data: SyncData) => {
        if (state.isOnline) {
            state.isSyncInProgress = true;
            try {
                const {[options.keyPath || 'id']: _, ...rest} = data;
                const request = async () => await fetch(options.url, {
                    method: options.method || 'POST',
                    body: JSON.stringify(rest),
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers,
                    },
                });

                const response = await retry(request);
                if (!response || !response.ok) {
                    console.error('[vue-offline-sync] Request failed. Storing offline data.', data);
                    await storeOfflineData(data);
                }
            } catch (error) {
                console.error('[vue-offline-sync] Network error while syncing:', error);
                await storeOfflineData(data);
            } finally {
                state.isSyncInProgress = false;
            }
        } else {
            await storeOfflineData(data);
        }
    };

    /**
     * Check if a data entry already exists based on uniqueKeys
     */
    const hasDuplicateEntry = async (data: SyncData) => {
        if (!options.uniqueKeys?.length) return false;

        const existingData: SyncData[] = await getData()
        return existingData.some((entry: SyncData) =>
            options.uniqueKeys.some(key => entry[key] === data[key])
        );
    }

    /**
     * Process and store data into IndexedDB
     */
    const storeOfflineData = async (data: SyncData) => {
        if (await hasDuplicateEntry(data)) {
            console.warn('[vue-offline-sync] Duplicate entry detected. Skipping insert: ', data);
            return;
        }

        await saveData(data);
        await fetchOfflineData();
        // Notify other tabs that new data was saved.
        channel.postMessage({type: 'new-data'});
    }

    const applyBulkSync = async (): Promise<void> => {
        const dataToSync = state.offlineData.map(({[options.keyPath || 'id']: _, ...rest}) => rest);
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

    const applyIndividualSync = async (): Promise<void> => {
        for (const data of state.offlineData) {
            const {[options.keyPath || 'id']: _, ...payload} = data;

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

            await removeData(data[options.keyPath || 'id']);
        }
    };

    onMounted(async (): Promise<void> => {
        console.log('[vue-offline-sync] Component mounted. Fetching offline data...');
        await fetchOfflineData();

        window.addEventListener('online', async (): Promise<void> => {
            console.log('[vue-offline-sync] Device is back online. Starting sync...');
            state.isOnline = true;
            state.isSyncInProgress = true;
            await syncOfflineData();
            state.isSyncInProgress = false;
        });

        window.addEventListener('offline', async (): Promise<void> => {
            console.log('[vue-offline-sync] Device is offline.');
            state.isOnline = false;
        });

        // Listen for updates from other tabs
        channel.addEventListener('message', async (event): Promise<void> => {
            if (event.data.type === 'synced' || event.data.type === 'new-data') {
                console.log('[vue-offline-sync] Sync event received from another tab, reloading offline data...');
                await fetchOfflineData();
            }
        });

        console.log('[vue-offline-sync] Initialization complete.');
    });

    return {
        state,
        saveOfflineData,
        syncOfflineData,
    };
}
