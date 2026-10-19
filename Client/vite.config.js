import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// StaffSync client — Vite config.
// If you already have a vite.config.js in your project, keep your existing
// config and only copy over the `server` options if needed.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: true,
    allowedHosts: true,
    proxy: {
      // Requests to /api are forwarded to the Express server during development,
      // so the client works without editing any env values.
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:5000',
        changeOrigin: true,
        configure: (proxy) => {
          // The browser sees this dev server as the origin, so drop the Origin
          // header before forwarding — the API only allowlists CLIENT_URL.
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
        },
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
});
