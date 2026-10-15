import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered from index.tsx via virtual:pwa-register
      includeAssets: ['favicon.ico', 'favicon.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: "Hi I'm an Alien",
        short_name: 'Hi Alien',
        description:
          'Something is peeking into your camera. Say hi before it vanishes, then talk with it for ninety strange seconds.',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#05060f',
        theme_color: '#05060f',
        categories: ['games', 'entertainment'],
        icons: [
          ...[48, 72, 96, 128, 144, 152, 192, 256, 384, 512].map(s => ({
            src: `/icons/icon-${s}.png`,
            sizes: `${s}x${s}`,
            type: 'image/png',
            purpose: 'any'
          })),
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // App shell + the alien GIFs are precached so the game opens offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,gif,webmanifest}'],
        globIgnores: ['**/XRAlienStage-*.js', '**/aliens/standing.gif', '**/aliens/status-preview.png'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // three.js chunk: only XR phones fetch it; cache it once they do.
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/XRAlienStage-'),
            handler: 'CacheFirst',
            options: { cacheName: 'xr-stage', expiration: { maxEntries: 4 } }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // three.js lives in a lazily-loaded chunk that only WebXR-capable phones download.
    chunkSizeWarningLimit: 600,
  },
});
