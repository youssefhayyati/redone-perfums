import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const aliases = {
    '@shared': fileURLToPath(new URL('./resources/js/shared', import.meta.url)),
    '@storefront': fileURLToPath(new URL('./resources/js/storefront', import.meta.url)),
    '@admin': fileURLToPath(new URL('./resources/js/admin', import.meta.url)),
};

export default defineConfig({
    plugins: [
        laravel({
            // Each SPA imports its own stylesheet from its entry point.
            input: ['resources/js/storefront/main.tsx', 'resources/js/admin/main.tsx'],
            refresh: true,
            fonts: [
                bunny('Cormorant Garamond', {
                    weights: [400, 500, 600],
                    styles: ['normal', 'italic'],
                    preload: [{ weight: 500 }],
                    fallbacks: ['Georgia', 'serif'],
                }),
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                    preload: [{ weight: 400 }, { weight: 500 }],
                    fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
                }),
            ],
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: aliases,
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
