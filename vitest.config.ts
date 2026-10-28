import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { sveltekitConfig } from './vite.config.js';

export default defineConfig({
  plugins: [sveltekit(sveltekitConfig)],
  test: {
    include: ['src/**/*.test.ts'],
    globals: true,
    environment: 'node',
  },
});
