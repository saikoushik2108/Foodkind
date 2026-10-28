import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://localhost:5050';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // Same-origin API calls in development: the browser only ever talks to
      // the Vite origin, so cookies are first-party and no CORS preflight is
      // needed for the custom CSRF header.
      '/api': {
        target: API_TARGET,
        changeOrigin: false,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.error('[vite proxy error]', err.message);
            if (res && typeof res.writeHead === 'function' && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: false,
                  error: {
                    message:
                      'Cannot reach backend server on port 5050. Please ensure the backend is running (run "node src/server.js" in the backend directory).',
                    code: 'BACKEND_OFFLINE',
                  },
                })
              );
            }
          });
        },
      },
      '/uploads': {
        target: API_TARGET,
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
    restoreMocks: true,
  },
});
