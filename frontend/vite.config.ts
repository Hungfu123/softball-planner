import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { API_RUNTIME_CACHING } from './src/pwa/apiCaching'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'deadsox.svg', 'deadsox.png'],
      manifest: {
        name: 'Softball Planner',
        short_name: 'Softball',
        description: 'Planungstool für Softball-Teams: Saisons, Spieltage, Lineups, Training.',
        // Die Systemleisten gehoeren dem Betriebssystem — CSS kommt da nicht ran,
        // Android liest beim Installieren diese beiden Werte und friert sie ein.
        // theme_color faerbt oben die Statusleiste, background_color unten die
        // Gesten-/Navigationsleiste (und den Splash). Beide Navy: die App bekommt
        // denselben dunklen Rahmen wie ihre eigene Navigationsleiste, die Gesten-
        // Pille bleibt hell und sichtbar. Mit #ffffff stand dort eine weisse Leiste
        // unter dem Cream.
        theme_color: '#122742',
        background_color: '#122742',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'de',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpeg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/drills/, /^\/actuator/],
        runtimeCaching: API_RUNTIME_CACHING,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      external: ['html2canvas'],
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/drills': 'http://localhost:8080',
      '/drills.pdf': 'http://localhost:8080',
    },
  },
})
