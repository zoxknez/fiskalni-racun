import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg'],
      injectRegister: 'auto',
      manifest: {
        name: 'Fiskalni Račun',
        short_name: 'Fiskalni',
        description: 'Evidencija fiskalnih računa i upravljanje garancijama',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Offline mode strategije
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache Supabase REST calls for offline resilience
            urlPattern: /^https:\/\/([a-z0-9-]+)\.supabase\.co\//i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        // Background sync for offline data
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api/,
          /^\/auth\/callback/,  // Allow OAuth callback to work
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@lib': resolve(__dirname, './lib')
    }
  },
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Framer Motion (animations)
          'framer-motion': ['framer-motion'],
          
          // OCR - Large library (~5MB) - lazy load
          'ocr': ['tesseract.js'],
          
          // QR Scanner - Large library (~500KB) - lazy load
          'qr-scanner': ['@zxing/library'],
          
          // Charts - Large library (~400KB) - lazy load
          'charts': ['recharts'],
          
          // UI Libraries
          'ui-libs': [
            'react-hot-toast',
            'react-hook-form',
            '@hookform/resolvers',
            'react-virtuoso'
          ],
          
          // i18n
          'i18n': ['react-i18next', 'i18next'],
          
          // Database & Storage
          'database': ['dexie', 'dexie-react-hooks', 'dexie-observable'],
          
          // Icons - Will be tree-shaken automatically
          'lucide': ['lucide-react'],
          
          // Utilities
          'utils': ['zod', 'clsx', 'tailwind-merge', 'date-fns', 'fuse.js']
        }
      }
    }
  }
})
