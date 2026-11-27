import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Forward API calls to the Express server during development. The end-to-end tests point it at their own
      // server with API_PROXY_TARGET (e2e/playwright.config.ts).
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    },
  },
})
