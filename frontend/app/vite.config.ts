import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL || 'http://localhost:3000'

  return {
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt', // Muestra prompt de actualización al usuario
      includeAssets: ['favicon.ico', 'icons/apple-touch-icon.png', 'icons/mask-icon.svg'],
      manifest: {
        name: 'La Costa Running Club',
        short_name: 'LCRC',
        description: 'App oficial del club de running de Fuengirola y Torrón',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
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
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // CacheFirst para Google Fonts (sin cambios frecuentes)
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // NetworkOnly para API — nunca cachear datos del backend
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // NetworkOnly para auth — nunca cachear tokens
            urlPattern: /^\/auth\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // NetworkOnly para datos de performance
            urlPattern: /^\/performance\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: true, // Activa SW en dev para pruebas locales
        navigateFallbackAllowlist: [/^\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    allowedHosts: true, // Permite tunnelmole y otros proxies externos
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  }
})

