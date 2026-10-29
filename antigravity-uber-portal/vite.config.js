import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'client',
  server: {
    host: '0.0.0.0',
    port: 5173,
    cors: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  }
});
