import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const clientPort = Number(process.env.PORT) || 3000;
const apiPort = Number(process.env.API_PORT) || 5000;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: clientPort,
    strictPort: true,
    allowedHosts: true,
    hmr: process.env.DISABLE_HMR !== 'true',
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: true
      }
    }
  }
});
