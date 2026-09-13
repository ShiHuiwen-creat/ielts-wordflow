import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaConfig } from './src/app/pwaConfig';

export default defineConfig({
  base: pwaConfig.base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'offline.html'],
      manifest: pwaConfig.manifest,
      workbox: {
        navigateFallback: `${pwaConfig.base}index.html`,
      },
    }),
  ],
});
