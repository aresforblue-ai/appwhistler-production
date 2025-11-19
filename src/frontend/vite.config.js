import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Read CDN_URL from environment for asset base path
const cdnUrl = process.env.CDN_URL || '';

export default defineConfig({
  plugins: [react()],
  base: cdnUrl || '/',
  build: {
    // Enable source maps for debugging in production
    sourcemap: process.env.NODE_ENV !== 'production',
    // Optimize chunks for CDN delivery
    rollupOptions: {
      output: {
        // Manual chunks for better CDN cache efficiency
        manualChunks: {
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom'
          ],
          'apollo': [
            '@apollo/client',
            'graphql'
          ]
        },
        // Hash filenames for cache busting
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|gif|svg|webp/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          } else if (/woff|woff2|ttf|otf|eot/i.test(ext)) {
            return `fonts/[name]-[hash][extname]`;
          } else if (ext === 'css') {
            return `css/[name]-[hash][extname]`;
          }
          return `[name]-[hash][extname]`;
        }
      }
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});

