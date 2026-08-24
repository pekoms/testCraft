import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TestCraft',
        short_name: 'TestCraft',
        description: 'Practica tus tests en cualquier momento',
        theme_color: '#D4571C',
        background_color: '#F5F3EE',
        display: 'standalone',
        start_url: '/testCraft/',
        scope: '/testCraft/',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // Cache all app assets
        globPatterns: ['**/*.{js,css,html,woff,woff2,ttf,svg,png,ico}'],
        navigateFallback: '/testCraft/index.html',
        // Don't intercept Supabase or LanguageTool API calls — handled by app-level cache
        navigateFallbackDenylist: [/^\/api/, /supabase\.co/, /languagetool/],
        runtimeCaching: [
          // Cache Google Fonts for a year
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  base: '/testCraft/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
  },
})
