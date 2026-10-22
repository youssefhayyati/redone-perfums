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
                // Storefront: a soft, characterful serif for display, a clean sans for text.
                bunny('Fraunces', {
                    weights: [300, 400, 500, 600],
                    styles: ['normal', 'italic'],
                    preload: [{ weight: 400 }],
                    fallbacks: ['Georgia', 'serif'],
                }),
                bunny('DM Sans', {
                    weights: [400, 500, 600],
                    preload: [{ weight: 400 }, { weight: 500 }],
                    fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
                }),
                // Arabic storefront: a calligraphic naskh for display, a clear sans for text.
                bunny('Amiri', {
                    weights: [400, 700],
                    subsets: ['arabic'],
                    preload: [{ weight: 400 }],
                    fallbacks: ['serif'],
                }),
                bunny('IBM Plex Sans Arabic', {
                    weights: [400, 500, 600],
                    subsets: ['arabic'],
                    preload: [{ weight: 400 }],
                    fallbacks: ['sans-serif'],
                }),
                // Admin interface.
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
            // Never source files; keeping them out matters when the watcher polls (Docker on Windows).
            ignored: ['**/storage/**', '**/vendor/**'],
        },
    },
});
