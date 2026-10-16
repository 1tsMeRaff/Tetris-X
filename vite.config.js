import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  root: './',
  server: {
    port: 3000,
    open: false
  },
  test: {
    environment: 'node',
    globals: true
  }
});
