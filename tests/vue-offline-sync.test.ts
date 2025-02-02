import {mount} from '@vue/test-utils';
import {vi, describe, it, expect, beforeEach, afterEach} from 'vitest';
import VueOfflineSync from '../src/vue-offline-sync';
import {saveData, getData, clearData, removeData, setKeyPath} from '../src/utils/indexedDB';

// Mock IndexedDB Functions
vi.mock('../src/utils/indexedDB', async (importOriginal) => {
    const actual = await importOriginal();

    return {
        saveData: vi.fn(),
        getData: vi.fn(() => Promise.resolve([{id: 1, name: 'Test Data'}])),
        clearData: vi.fn(),
        removeData: vi.fn(),
        setKeyPath: vi.fn(),
    }
});

// Mock global navigator and window objects
beforeEach(() => {
    vi.restoreAllMocks();

    // Mock navigator.online
    Object.defineProperty(globalThis.navigator, 'online', {
        value: true,
        writable: true,
    });

    // Mock window.addEventListener
    vi.spyOn(globalThis, 'addEventListener')

    // Mock fetch globally, so it doesn't call the real API
    globalThis.fetch = vi.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({success: true}),
        })
    ) as unknown as typeof fetch;
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
})

describe('VueOfflineSync Component', () => {
    it('should initialize correctly', async () => {
        const wrapper = mount(VueOfflineSync);
        await wrapper.vm.$nextTick();
        expect(wrapper.vm.state.isOnline).toBe(true);
        expect(getData).toHaveBeenCalled();
    });

    it('should save offline data', async () => {
        const wrapper = mount(VueOfflineSync);
        const testData = {id: 1, name: 'Test Data'};

        wrapper.vm.state.isOnline = false;

        await wrapper.vm.saveOfflineData(testData);

        expect(saveData).toHaveBeenCalledWith(testData);
        expect(getData).toHaveBeenCalled();
    });

    it('should sync offline data when online', async () => {
        const wrapper = mount(VueOfflineSync);

        wrapper.vm.state.isOnline = false;
        await wrapper.vm.saveOfflineData({ id: 1, name: 'Test' });

        wrapper.vm.state.isOnline = true;
        await wrapper.vm.syncOfflineData();

        expect(globalThis.fetch).toHaveBeenCalled();
        expect(clearData).toHaveBeenCalled();
        expect(getData).toHaveBeenCalled();
    });

    it('should not sync if offline or no data', async () => {
        const wrapper = mount(VueOfflineSync);

        wrapper.vm.state.isOnline = false;
        wrapper.vm.state.offlineData = [{id: 1, name: 'Test'}];
        await wrapper.vm.syncOfflineData();
        expect(globalThis.fetch).not.toHaveBeenCalled();

        wrapper.vm.state.isOnline = true;
        wrapper.vm.state.offlineData = [];
        await wrapper.vm.syncOfflineData();
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
        const wrapper = mount(VueOfflineSync, {
            props: {url: 'https://mock-api.com/sync'},
        });

        wrapper.vm.state.isOnline = true;
        wrapper.vm.state.offlineData = [{id: 1, name: 'Test'}];

        // Simulate API failure
        globalThis.fetch = vi.fn(() =>
            Promise.resolve({
                ok: false,
                json: () => Promise.resolve({success: false}),
            })
        ) as unknown as typeof fetch;

        await wrapper.vm.syncOfflineData();

        expect(globalThis.fetch).toHaveBeenCalled();
        expect(removeData).not.toHaveBeenCalled();
    });
});

describe('VueOfflineSync Bulk and Individual Syncing', () => {
    it('should send data as an array when bulkSync is true', async () => {
        const wrapper = mount(VueOfflineSync, {
            props: {url: 'https://mock-api.com/sync', bulkSync: true},
        });

        wrapper.vm.state.isOnline = true;
        wrapper.vm.state.offlineData = [
            {id: 1, name: 'company A'},
            {id: 2, name: 'company B'}
        ];

        await wrapper.vm.syncOfflineData();

        // ✅ Ensure only ONE bulk request was sent
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            'https://mock-api.com/sync',
            expect.objectContaining({
                body: JSON.stringify([
                    {name: 'company A'},
                    {name: 'company B'}
                ])
            })
        );
    });

    it('should send each entry individually when bulkSync is false', async () => {
        const wrapper = mount(VueOfflineSync, {
            props: {url: 'https://mock-api.com/sync', bulkSync: false},
        });

        wrapper.vm.state.isOnline = true;
        wrapper.vm.state.offlineData = [
            {id: 1, name: 'company A'},
            {id: 2, name: 'company B'}
        ];

        await wrapper.vm.syncOfflineData();

        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
        expect(globalThis.fetch).toHaveBeenNthCalledWith(1, 'https://mock-api.com/sync', expect.anything());
        expect(globalThis.fetch).toHaveBeenNthCalledWith(2, 'https://mock-api.com/sync', expect.anything());
    });
});
