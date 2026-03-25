import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'CTRL — Операционная система жизни',
        short_name: 'CTRL',
        description: 'Персональная платформа для управления проектами, временем и жизнью',
        theme_color: '#1E1B2E',
        background_color: '#1E1B2E',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/ctrl-pwa/',
        scope: '/ctrl-pwa/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  base: '/ctrl-pwa/',
})
