import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [vue()],
    build: {
        lib: {
            entry: 'src/vue-offline-sync.ts',
            name: 'VueOfflineSync',
            fileName: (format) => `vue-offline-sync.${format}.js`,
        },
        rollupOptions: {
            external: ['vue'],
            output: {
                globals: {
                    vue: 'Vue',
                },
            },
        },
    },
});