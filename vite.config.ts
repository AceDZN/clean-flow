import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5195, strictPort: true },
  preview: { port: 4195, strictPort: true },
  build: { chunkSizeWarningLimit: 1200 },
  test: { include: ['tests/**/*.test.ts'] },
} as never);
