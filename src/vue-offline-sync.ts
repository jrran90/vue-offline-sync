import {defineComponent, onMounted, reactive} from 'vue';
import {clearData, getData, removeData, saveData, setKeyPath} from './utils/indexedDB';

interface SyncData {
    [key: string]: any;
}

export default defineComponent({
    name: 'VueOfflineSync',
    props: {
        url: {
            type: String,
            required: true,
        },
        method: {
            type: String,
            default: 'POST',
        },
        headers: {
            type: Object,
            default: () => ({}),
        },
        // Allows the user to define their own key field.
        keyPath: {
            type: String,
            default: 'id',
        },
        bulkSync: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        setKeyPath(props.keyPath);

        const state = reactive({
            isOnline: navigator.onLine,
            offlineData: [] as SyncData[],
        });

        const fetchOfflineData = async () => {
            state.offlineData = await getData();
        };

        const syncOfflineData = async () => {
            if (!state.isOnline || state.offlineData.length === 0) return;

            try {
                if (props.bulkSync) {
                    await applyBulkSync();
                } else {
                    await individualSync();
                }
            } catch (error) {
                console.error('Network error during sync:', error);
            }

            // Refresh offline data after syncing
            await fetchOfflineData()
        };

        const saveOfflineData = async (data: SyncData) => {
            if (state.isOnline) {
                try {
                    const {[props.keyPath]: _, ...rest} = data;
                    await fetch(props.url, {
                        method: props.method,
                        body: JSON.stringify(rest),
                        headers: {
                            'Content-Type': 'application/json',
                            ...props.headers,
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
            const dataToSync = state.offlineData.map(({[props.keyPath]: _, ...rest}) => rest);
            const response = await fetch(props.url, {
                method: props.method,
                body: JSON.stringify(dataToSync),
                headers: {
                    'Content-Type': 'application/json',
                    ...props.headers,
                },
            });

            if (!response.ok) {
                console.error(`Bulk sync failed with status: ${response.status}`);
                return;
            }

            await clearData();
        }

        const individualSync = async () => {
            for (const data of state.offlineData) {
                // Remove keyPath before sending the data
                const {[props.keyPath]: _, ...payload} = data;

                const response = await fetch(props.url, {
                    method: props.method,
                    body: JSON.stringify(payload),
                    headers: {
                        'Content-Type': 'application/json',
                        ...props.headers,
                    },
                });

                if (!response.ok) {
                    console.error(`Sync failed with status: ${response.status}`);
                    continue;
                }

                // Only remove successfully sync entry from IndexedDB
                await removeData(data[props.keyPath]);
            }
        }

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
    },
});