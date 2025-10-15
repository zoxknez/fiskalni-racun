import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Modern Vitest Configuration
 * 
 * Features:
 * - React Testing Library integration
 * - TypeScript support
 * - Code coverage
 * - UI mode
 * - Watch mode
 */
export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Global test utilities
    globals: true,
    
    // Setup files
    setupFiles: ['./src/test/setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
      ],
      // Coverage thresholds
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
    
    // Include/exclude patterns
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    
    // Test timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Concurrency
    sequence: {
      shuffle: false,
    },
    
    // Reporter
    reporters: ['verbose'],
    
    // UI configuration
    ui: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@lib': path.resolve(__dirname, './lib'),
    },
  },
})

