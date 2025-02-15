interface SyncData {
    [key: string]: any;
}

const DB_NAME: string = 'vueOfflineSync';
const STORE_NAME: string = 'syncData';
const DB_VERSION: number = 1;
const keyPath: string = 'syncId';

export function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(new Error('Failed to open IndexedDB.'));
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBRequest).result;

            // Re-create
            if (db.objectStoreNames.contains(STORE_NAME)) {
                db.deleteObjectStore(STORE_NAME);
            }
            db.createObjectStore(STORE_NAME, {keyPath, autoIncrement: true});
        };
    });
}

export async function saveData(data: SyncData): Promise<SyncData> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        if (!(keyPath in data)) {
            data[keyPath] = Date.now();
        }

        const request = store.put(data);
        request.onsuccess = () => resolve(data);
        request.onerror = () => reject(new Error('Failed to save data.'));
    });
}

export async function getData(): Promise<SyncData[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('Failed to retrieve data.'));
    });
}

export async function clearData(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to clear data.'));
    });
}

export async function removeData(id: number | string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to remove entry with id: ${id}`));
    });
}