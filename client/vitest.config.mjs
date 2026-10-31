import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // the project keeps JSX in .js files; the oxc option makes Vite parse them as JSX
  plugins: [react()],
  oxc: { jsx: { runtime: 'automatic' }, lang: 'jsx', include: /\.js$/ },
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
    clearMocks: true,
  },
});
