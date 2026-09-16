import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
  },
  plugins: [
    VitePWA({
      // Waiting service worker (next-launch activation): updates download in
      // the background but never take over a running session — activation
      // happens only after all instances close, with no update-prompt UI
      // (the zero-text shell has no room for one). The manifest ships by hand
      // from public/manifest.webmanifest; the plugin owns the service worker.
      manifest: false,
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,riv,png,jpg,jpeg,svg,ico,webmanifest}'],
        navigateFallback: 'index.html',
        // Claim on first activation so the install session is controlled (and
        // offline-ready) without a reload. Activation only ever happens on
        // first install or once all instances have closed, so claiming can
        // never take over a running session.
        clientsClaim: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
