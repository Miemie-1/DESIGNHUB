import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    testTimeout: 60000,
    hookTimeout: 120000, // first run downloads the mongod binary
    fileParallelism: false, // each file starts its own in-memory mongod; keep it light
  },
});
