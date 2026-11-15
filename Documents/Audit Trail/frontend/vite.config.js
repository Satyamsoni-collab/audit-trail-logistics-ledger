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
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Security: Disable source maps in production releases
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        // Day 30: Production Chunk Splitting & Performance Optimization
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-antd': ['antd'],
          'vendor-icons': ['@ant-design/icons'],
          'vendor-charts': ['recharts']
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
});
