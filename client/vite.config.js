import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server proxies API calls to the FastAPI backend so the browser only
// ever talks to our own origin (the TMDB key stays on the server).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
