// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://nirvanaconstruction.net',
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    /* three.js is only ever reached by dynamic import(), so the dev
       server would otherwise discover it mid-visit, re-optimise, and
       answer the in-flight request with 504 "Outdated Optimize Dep" —
       the 3D heroes then fall back to their static photo. Pre-bundle it
       at startup instead. Dev-only; production builds are unaffected. */
    optimizeDeps: {
      include: ['three', 'three/examples/jsm/environments/RoomEnvironment.js'],
    },
  },
});
