import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
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
