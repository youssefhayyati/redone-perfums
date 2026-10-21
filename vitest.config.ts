import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@shared': fileURLToPath(new URL('./resources/js/shared', import.meta.url)),
            '@storefront': fileURLToPath(new URL('./resources/js/storefront', import.meta.url)),
            '@admin': fileURLToPath(new URL('./resources/js/admin', import.meta.url)),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['resources/js/**/*.test.{ts,tsx}'],
        restoreMocks: true,
        unstubGlobals: true,
    },
});
