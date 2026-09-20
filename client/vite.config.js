import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server proxies API calls to the FastAPI backend so the browser only
// ever talks to our own origin (the TMDB key stays on the server).
export default defineConfig({
  plugins: [react()],
  server: {
    // host: true (0.0.0.0) lets the phone on the hotspot reach the dev
    // server at http://<PC-LAN-IP>:5173 instead of only localhost.
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
