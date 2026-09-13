import type { ManifestOptions } from 'vite-plugin-pwa';

const base = '/ielts-wordflow/';

const manifest: Partial<ManifestOptions> = {
  name: 'IELTS WordFlow',
  short_name: 'WordFlow',
  description: '离线优先的雅思核心词汇学习工具',
  lang: 'zh-CN',
  display: 'standalone',
  theme_color: '#174c3c',
  background_color: '#f5f0e6',
  start_url: base,
  scope: base,
  icons: [
    {
      src: 'icons/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: 'icons/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: 'icons/maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

export const pwaConfig = { base, manifest };
