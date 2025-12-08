import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import viteCompression from 'vite-plugin-compression'
import Inspect from 'vite-plugin-inspect'
import { VitePWA } from 'vite-plugin-pwa'
import ViteRestart from 'vite-plugin-restart'

// mali helper za “sad” pečat u bundle-u
const BUILD_TIME = new Date().toISOString()
const _IS_DEV = process.env.NODE_ENV === 'development'

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

    // PWA - koristi injectManifest za custom service worker
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['logo.svg', 'robots.txt', 'favicon.svg'],
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
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
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Dodaj račun',
            short_name: 'Dodaj',
            description: 'Brzo dodavanje novog računa',
            url: '/add?source=shortcut',
            icons: [{ src: '/icon-192.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Garancije',
            short_name: 'Garancije',
            description: 'Pregled garancija',
            url: '/warranties?source=shortcut',
            icons: [{ src: '/icon-192.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Pretraga',
            short_name: 'Traži',
            description: 'Pretraži račune',
            url: '/search?source=shortcut',
            icons: [{ src: '/icon-192.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
        categories: ['finance', 'productivity', 'utilities'],
        // Screenshots - zakomentarisano dok se ne kreiraju
        // screenshots: [
        //   {
        //     src: '/screenshots/home.png',
        //     sizes: '1170x2532',
        //     type: 'image/png',
        //     label: 'Početna stranica',
        //   },
        //   {
        //     src: '/screenshots/receipts.png',
        //     sizes: '1170x2532',
        //     type: 'image/png',
        //     label: 'Lista računa',
        //   },
        // ],
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

    // ⭐ ADDED: Modern optimizations
    modulePreload: { polyfill: false }, // Remove polyfill for modern browsers
    assetsInlineLimit: 4096, // Inline assets < 4KB

    rollupOptions: {
      output: {
        // Koristiti [hash] za invalidaciju cache-a pri svakom buildu
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        experimentalMinChunkSize: 20000,

        // ⭐ ADDED: Modern code generation
        generatedCode: {
          preset: 'es2015',
          constBindings: true,
        },
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
          if (
            id.includes('@radix-ui') ||
            id.includes('cmdk') ||
            id.includes('vaul') ||
            id.includes('sonner') ||
            id.includes('react-hot-toast')
          ) {
            return 'ui-libs'
          }

          // Animations
          if (id.includes('framer-motion')) return 'animations'

          // Forms & Validation
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
            return 'forms'
          }

          // Heavy libs - odvojeno
          // NOTE: Tesseract.js is already lazy-loaded in lib/ocr.ts (dynamic import)
          // so we don't need to split it here - it's automatically code-split by Vite
          if (id.includes('recharts')) return 'charts'

          // i18n
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n'

          // Database
          if (id.includes('dexie')) return 'database'

          // Backend
          if (id.includes('@sentry')) return 'backend'

          // Icons - lightweight
          if (id.includes('lucide-react')) return 'icons'

          // Utilities
          if (
            id.includes('clsx') ||
            id.includes('tailwind-merge') ||
            id.includes('date-fns') ||
            id.includes('class-variance-authority')
          ) {
            return 'utils'
          }

          // Sve ostalo
          return 'vendor'
        },
      },
    },
  },

  // ⭐ ADDED: ESBuild optimizations
  esbuild: {
    // Drop debugger statements and console.log in production (keep console.error/warn for debugging)
    drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
    pure:
      process.env.NODE_ENV === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
    legalComments: 'none', // Remove license comments for smaller bundles
    treeShaking: true,
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      // NOTE: tesseract.js intentionally NOT included - it's lazy-loaded in lib/ocr.ts
    ],
    exclude: ['@zxing/library', 'sql.js'],
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
