import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: false,
    // E2E-Specs sind Playwright-Tests, nicht Vitest — explizit ausschließen
    exclude: ['node_modules', 'dist', 'e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // vite-plugin-pwa erzeugt dieses Modul erst beim Bauen. Ohne Alias bricht in Vitest
      // schon der Import ab — noch bevor ein `vi.mock` greifen koennte.
      'virtual:pwa-register/react': path.resolve(__dirname, './src/pwa/registerStub.ts'),
    },
  },
})
