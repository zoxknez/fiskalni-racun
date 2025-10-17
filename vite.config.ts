import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'
import checker from 'vite-plugin-checker'
import Inspect from 'vite-plugin-inspect'
import ViteRestart from 'vite-plugin-restart'

// mali helper za “sad” pečat u bundle-u
const BUILD_TIME = new Date().toISOString()

export default defineConfig({
  plugins: [
    // React (SWC)
    react(),

    // Type-check + Biome tokom dev-a (bez blokiranja build-a)
    checker({
      typescript: true,
      biome: { command: 'check' },
      overlay: { initialIsOpen: false, position: 'br' },
      enableBuild: false,
    }),

    // Inspekcija Vite pipeline-a
    Inspect({ build: true, outputDir: '.vite-inspect' }),

    // Auto-restart na promene ključnih configa
    ViteRestart({
      restart: [
        'vite.config.*',
        'tailwind.config.*',
        'postcss.config.*',
        'biome.json',
        'tsconfig.json',
      ],
    }),

    // Kompresije (Brotli + Gzip)
    viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
    viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),

    // Bundle vizualizacija
    visualizer({
      open: false,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),

    // PWA
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['logo.svg', 'robots.txt', 'favicon.svg'],
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
          { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
          // iOS voli PNG – dodaj i apple-touch ikonu ako je imaš
          // { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
        ],
        shortcuts: [
          {
            name: 'Dodaj račun',
            short_name: 'Dodaj',
            description: 'Brzo dodavanje novog računa',
            url: '/add?source=shortcut',
            icons: [{ src: '/icons/add.png', sizes: '96x96' }],
          },
          {
            name: 'Skeniraj QR',
            short_name: 'QR',
            description: 'Skeniraj QR kod sa računa',
            url: '/add?mode=qr&source=shortcut',
            icons: [{ src: '/icons/qr.png', sizes: '96x96' }],
          },
          {
            name: 'Garancije',
            short_name: 'Garancije',
            description: 'Pregled garancija',
            url: '/warranties?source=shortcut',
            icons: [{ src: '/icons/warranty.png', sizes: '96x96' }],
          },
          {
            name: 'Pretraga',
            short_name: 'Traži',
            description: 'Pretraži račune',
            url: '/search?source=shortcut',
            icons: [{ src: '/icons/search.png', sizes: '96x96' }],
          },
        ],
        categories: ['finance', 'productivity', 'utilities'],
        screenshots: [
          { src: '/screenshots/home.png', sizes: '1170x2532', type: 'image/png', label: 'Početna stranica' },
          { src: '/screenshots/receipts.png', sizes: '1170x2532', type: 'image/png', label: 'Lista računa' },
        ],
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [{ name: 'media', accept: ['image/*', 'application/pdf'] }],
          },
        },
        file_handlers: [
          {
            action: '/open-receipt',
            accept: {
              'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
              'application/pdf': ['.pdf'],
            },
          },
        ],
        protocol_handlers: [{ protocol: 'web+receipt', url: '/receipt?url=%s' }],
      },
      workbox: {
        // bolji offline doživljaj
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // Supabase REST/Web endpoints
          {
            urlPattern: /^https:\/\/([a-z0-9-]+)\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-styles',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts files
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Slike
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth\/callback/],
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@lib': resolve(__dirname, './lib'),
      '@components': resolve(__dirname, './src/components'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@types': resolve(__dirname, './types'),
    },
  },

  // dozvoli import HEIC/HEIF fajlova ako ih OCR koristi
  assetsInclude: ['**/*.heic', '**/*.heif'],

  server: {
    host: true,
    port: 3000,
    open: false,
    strictPort: false,
    hmr: { overlay: true },
    watch: {
      usePolling: false,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    },
  },

  preview: {
    host: true,
    port: 4173,
    open: false,
  },

  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,

    cssCodeSplit: true,
    cssMinify: 'lightningcss',

    minify: 'esbuild',
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Koristiti [hash] za invalidaciju cache-a pri svakom buildu
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        experimentalMinChunkSize: 20000,
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return
          
          // React Core - MORA biti odvojen da bi se inicijalizovao prvi
          if (id.includes('react/') || id.includes('react-dom/') || id.includes('scheduler')) {
            return 'react-core'
          }
          
          // React Router - drugi po redu
          if (id.includes('react-router') || id.includes('@remix-run')) {
            return 'react-router'
          }
          
          // State management - treci
          if (id.includes('zustand') || id.includes('use-sync-external-store')) {
            return 'state'
          }
          
          // UI Libraries - četvrti (bez Reacta!)
          if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('vaul') || 
              id.includes('sonner') || id.includes('react-hot-toast')) {
            return 'ui-libs'
          }
          
          // Animations
          if (id.includes('framer-motion')) return 'animations'
          
          // Forms & Validation
          if (id.includes('react-hook-form') || id.includes('@hookform') || 
              id.includes('zod')) {
            return 'forms'
          }
          
          // Heavy libs - odvojeno
          if (id.includes('tesseract')) return 'ocr'
          if (id.includes('@zxing')) return 'qr-scanner'
          if (id.includes('recharts')) return 'charts'
          
          // i18n
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n'
          
          // Database
          if (id.includes('dexie')) return 'database'
          
          // Backend
          if (id.includes('@supabase') || id.includes('@sentry')) return 'backend'
          
          // Icons - lightweight
          if (id.includes('lucide-react')) return 'icons'
          
          // Utilities
          if (id.includes('clsx') || id.includes('tailwind-merge') || 
              id.includes('date-fns') || id.includes('class-variance-authority')) {
            return 'utils'
          }
          
          // Sve ostalo
          return 'vendor'
        },
      },
    },
  },

  // NE uklanjaj console u prod - može lomiti kod!
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      'tesseract.js',
    ],
    exclude: ['@zxing/library'],
    esbuildOptions: {
      target: 'es2022',
    },
  },

  // korisne compile-time konstante
  define: {
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
    'process.env': JSON.stringify({
      NODE_ENV: process.env.NODE_ENV ?? 'development',
    }),
  },
})
