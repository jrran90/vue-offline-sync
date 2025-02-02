import {onMounted, reactive} from 'vue';
import {clearData, getData, removeData, saveData, setKeyPath} from './utils/indexedDB';

interface SyncData {
    [key: string]: any;
}

interface UseOfflineSyncOptions {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    keyPath?: string;
    bulkSync?: boolean;
}

export function useOfflineSync(options: UseOfflineSyncOptions) {
    const state = reactive({
        isOnline: navigator.onLine,
        offlineData: [] as SyncData[],
    });

    setKeyPath(options.keyPath || 'id');

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
            console.error('Network error during sync:', error);
        }

        // Refresh offline data after syncing
        await fetchOfflineData();
    };

    const saveOfflineData = async (data: SyncData) => {
        if (state.isOnline) {
            try {
                const {[options.keyPath || 'id']: _, ...rest} = data;
                await fetch(options.url, {
                    method: options.method || 'POST',
                    body: JSON.stringify(rest),
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers,
                    },
                });
            } catch (error) {
                console.error('Network error while syncing:', error);
            }
        } else {
            await saveData(data);
            await fetchOfflineData();
        }
    };

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
            console.error(`Bulk sync failed with status: ${response.status}`);
            return;
        }

        await clearData();
    };

    const individualSync = async () => {
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
                console.error(`Sync failed with status: ${response.status}`);
                continue;
            }

            await removeData(data[options.keyPath || 'id']);
        }
    };

    onMounted(async () => {
        window.addEventListener('online', async () => {
            state.isOnline = true;
            await syncOfflineData();
        });

        window.addEventListener('offline', async () => {
            state.isOnline = false;
        });

        await fetchOfflineData();
    });

    return {
        state,
        saveOfflineData,
        syncOfflineData,
    };
}
