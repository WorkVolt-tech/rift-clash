import { defineConfig } from 'vite';

// Relative asset URLs work on GitHub Pages' /rift-clash/ subpath and on Cloudflare Pages.
export default defineConfig({ base: './' });
