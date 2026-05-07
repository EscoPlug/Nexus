import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// When deployed to GitHub Pages: base = '/Nexus/'
// When running locally: base = '/'
const base = process.env.VITE_BASE_URL ?? '/';

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
