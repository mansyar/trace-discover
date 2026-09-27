import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { CONTENT_CACHE_NAME } from './src/pwa/cachePolicy.js';

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
        // Content assets are warmed into the runtime cache after boot. Keeping
        // them out of the precache manifest is the entry-count reduction; the
        // shell and all boot-critical files remain precached below.
        globPatterns: ['**/*.{js,css,html,wasm,riv,webp,png,jpg,jpeg,svg,ico,webmanifest}'],
        globIgnores: ['**/art/**/*', '**/rive/**/*'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/art/') || url.pathname.startsWith('/rive/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: CONTENT_CACHE_NAME,
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 250 },
            },
          },
        ],
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
    // Dev-tooling suites (e.g. the pack validator) run alongside app tests.
    include: ['src/**/*.test.ts', 'dev/tools/**/*.test.ts'],
    coverage: {
      // Dev-only asset/pack tooling is tested by Vitest but excluded from
      // shipped-app coverage; the app remains the product-quality boundary.
      exclude: ['dev/tools/**'],
      // Enforced gate calibrated to the measured master baseline (track
      // ci-qa-hardening_20260917): 72.88 / 77.55 / 89.57 / 72.42 at fa84ee1.
      // Active only when coverage runs (`pnpm test --coverage`); CI runs it.
      thresholds: { statements: 72, branches: 76, functions: 88, lines: 72 },
    },
  },
});
