import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// SvelteKit 3 takes its configuration here instead of in svelte.config.js.
export const sveltekitConfig = {
  preprocess: vitePreprocess(),
  adapter: adapter({
    out: 'build',
    precompress: false,
    envPrefix: ''
  }),
  // adapter-node 6 no longer reads ORIGIN at runtime. Taken from the build
  // environment instead; without it the origin comes from the Host header.
  ...(process.env.ORIGIN ? { paths: { origin: process.env.ORIGIN } } : {})
};

export default defineConfig({
  plugins: [sveltekit(sveltekitConfig)],
  server: {
    port: 5173,
    strictPort: false
  }
});
