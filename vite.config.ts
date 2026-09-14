import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
  },
  plugins: [
    VitePWA({
      // Silent background updates on next launch: no update-prompt UI, which
      // the zero-text shell has no room for. The manifest ships by hand from
      // public/manifest.webmanifest; the plugin owns the service worker.
      manifest: false,
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,riv,png,jpg,jpeg,svg,ico,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
