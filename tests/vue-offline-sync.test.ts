import {vi, describe, it, expect, beforeEach, afterEach} from 'vitest';
import {saveData, getData, clearData, removeData, setKeyPath} from '../src/utils/indexedDB';
import {mount} from "@vue/test-utils";
import {useOfflineSync} from '../src/vue-offline-sync';

// Mock BroadcastChannel
const postMessageMock = vi.fn();
const addEventListenerMock = vi.fn();
class MockBroadcastChannel {
    postMessage = postMessageMock;
    addEventListener = addEventListenerMock;
    close = vi.fn();
}
vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

// Mock IndexedDB Functions
vi.mock('../src/utils/indexedDB', () => ({
    saveData: vi.fn(),
    getData: vi.fn(() => Promise.resolve([{id: 1, name: 'Test Data'}])),
    clearData: vi.fn(),
    removeData: vi.fn(),
    setKeyPath: vi.fn(),
}));

// Properly typed fetch mock
vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(JSON.stringify({success: true}), {status: 200, headers: {'Content-Type': 'application/json'}})
));

beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();

    // Mock navigator.online
    Object.defineProperty(globalThis.navigator, 'onLine', {
        value: true,
        writable: true,
    });

    // Mock event listeners
    vi.spyOn(globalThis, 'addEventListener');
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
});

describe('useOfflineSync Composable', () => {
    it('should initialize correctly', async () => {
        const wrapper = mount({
            setup() {
                return useOfflineSync({url: 'https://mock-api.com/sync'});
            },
            template: '<div></div>'
        });

        const {state} = wrapper.vm;

        expect(state.isOnline).toBe(true);
        expect(getData).toHaveBeenCalled();
    });

    it('should save offline data when offline', async () => {
        const wrapper = mount({
            setup() {
                return useOfflineSync({url: 'https://mock-api.com/sync'});
            },
            template: '<div></div>'
        });

        const {saveOfflineData, state} = wrapper.vm;

        state.isOnline = false;
        const testData = {id: 1, name: 'Test Data'};

        await saveOfflineData(testData);

        expect(saveData).toHaveBeenCalledWith(testData);
        expect(getData).toHaveBeenCalled();
    });

    it('should sync offline data when online', async () => {
        const wrapper = mount({
            setup() {
                return useOfflineSync({url: 'https://mock-api.com/sync'});
            },
            template: '<div></div>'
        });

        const {saveOfflineData, syncOfflineData, state} = wrapper.vm;

        state.isOnline = false;
        await saveOfflineData({id: 1, name: 'Test'});

        state.isOnline = true;
        await syncOfflineData();

        expect(fetch).toHaveBeenCalled();
        expect(getData).toHaveBeenCalled();
    });

    it('should not sync if offline or no data', async () => {
        const wrapper = mount({
            setup() {
                return useOfflineSync({url: 'https://mock-api.com/sync'});
            },
            template: '<div></div>'
        });

        const {syncOfflineData, state} = wrapper.vm;

        state.isOnline = false;
        await syncOfflineData();
        expect(fetch).not.toHaveBeenCalled();

        state.isOnline = true;
        state.offlineData = [];
        await syncOfflineData();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
        const wrapper = mount({
            setup() {
                return useOfflineSync({url: 'https://mock-api.com/sync'});
            },
            template: '<div></div>'
        });

        const {syncOfflineData, state} = wrapper.vm;

        state.isOnline = true;
        state.offlineData = [{id: 1, name: 'Test'}];

        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({success: false}), {status: 500, headers: {'Content-Type': 'application/json'}})
        ));

        await syncOfflineData();

        expect(fetch).toHaveBeenCalled();
        expect(removeData).not.toHaveBeenCalled();
    });
});

describe('useOfflineSync Multi-Tab Support', () => {
    it('should notify other tabs when data is saved', async () => {
        const wrapper = mount({
            setup() {
                return useOfflineSync({url: 'https://mock-api.com/sync'});
            },
            template: '<div></div>'
        });

        const {state, saveOfflineData} = wrapper.vm;

        state.isOnline = false;
        await saveOfflineData({name: 'Test data'});

        expect(postMessageMock).toHaveBeenCalledWith({type: 'new-data'});
    });

    it('should notify other tabs when data is synced', async () => {
        const wrapper = mount({
            setup() {
                return useOfflineSync({url: 'https://mock-api.com/sync'});
            },
            template: '<div></div>'
        });

        const {state, syncOfflineData, saveOfflineData} = wrapper.vm;

        state.isOnline = false;
        await saveOfflineData({name: 'Test data new'});

        state.isOnline = true;
        await syncOfflineData();

        expect(postMessageMock).toHaveBeenCalledWith({ type: 'synced' });
    });

    it('should listen for updates from other tabs', async () => {
        mount({
            setup() {
                return useOfflineSync({url: 'https://mock-api.com/sync'});
            },
            template: '<div></div>'
        });

        // Simulate an event being received
        const eventHandler = addEventListenerMock.mock.calls[0][1];
        const event = { data: { type: 'synced' } };

        await eventHandler(event);

        expect(getData).toHaveBeenCalled();
    });
});
