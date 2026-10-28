import { defineConfig } from 'vite';

export default defineConfig({
  css: {
    postcss: {}
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
