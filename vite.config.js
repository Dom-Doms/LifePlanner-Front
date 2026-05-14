import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        vue(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'service-worker.ts',
            registerType: 'autoUpdate',
            includeAssets: ['apple-touch-icon.png', 'icons/pwa-192x192.png', 'icons/pwa-512x512.png', 'icons/maskable-icon-512x512.png', 'icons/badge-72x72.png'],
            manifest: {
                name: 'LifePlanner',
                short_name: 'LifePlanner',
                description: 'Agenda personale per giornate, calendario, studio e allenamenti',
                id: '/',
                lang: 'it-IT',
                theme_color: '#2563eb',
                background_color: '#f4f7fb',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                scope: '/',
                icons: [
                    {
                        src: '/icons/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/icons/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: '/icons/maskable-icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
            injectManifest: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
            },
            workbox: {
                navigateFallback: '/index.html',
                globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: true,
                runtimeCaching: [
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.origin === 'https://api-lifeplanner.gesu.gay',
                        handler: 'NetworkOnly',
                        method: 'GET',
                    },
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.origin === 'https://api-lifeplanner.gesu.gay',
                        handler: 'NetworkOnly',
                        method: 'POST',
                    },
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.origin === 'https://api-lifeplanner.gesu.gay',
                        handler: 'NetworkOnly',
                        method: 'PUT',
                    },
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.origin === 'https://api-lifeplanner.gesu.gay',
                        handler: 'NetworkOnly',
                        method: 'PATCH',
                    },
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.origin === 'https://api-lifeplanner.gesu.gay',
                        handler: 'NetworkOnly',
                        method: 'DELETE',
                    },
                    {
                        urlPattern: ({ request }) => request.destination === 'document',
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'lifeplanner-pages',
                            networkTimeoutSeconds: 3,
                        },
                    },
                ],
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
