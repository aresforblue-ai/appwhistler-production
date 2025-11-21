import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2015',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom']
        },
      },
    },
    chunkSizeWarningLimit: 600,
    sourcemap: false,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: true,
    cors: true,
  },
  preview: {
    port: 3000,
  },
});