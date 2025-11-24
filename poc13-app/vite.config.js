import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  base: '/minip2p/poc13/',
  build: {
    outDir: '../poc13',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: path.resolve(__dirname, 'test/setup.js'),
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
