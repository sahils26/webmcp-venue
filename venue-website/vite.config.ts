import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/agent-api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/agent-api/, ''),
      },
    },
  },
  test: {
    css: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/main.tsx',
        'src/tests/**',
        // Legacy components retained in the codebase but not used in the
        // current landing page design — excluded to keep thresholds meaningful.
        'src/components/WelcomePage.tsx',
        'src/components/VenueSearchCard.tsx',
        'src/components/landing/VenueDetailsModal.tsx',
        'src/components/landing/VenueShowcaseSection.tsx',
        // Retained temporarily for its shared type while backend persistence
        // replaces browser localStorage at runtime.
        'src/features/bookings/bookingStorage.ts',
      ],
      thresholds: {
        branches: 70,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
})
