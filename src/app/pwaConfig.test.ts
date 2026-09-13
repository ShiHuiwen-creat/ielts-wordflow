import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pwaConfig } from './pwaConfig';

function pngDimensions(path: string): { width: number; height: number } {
  const bytes = readFileSync(resolve(process.cwd(), 'public', path));

  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(bytes.byteLength).toBeGreaterThan(500);

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

describe('PWA configuration', () => {
  it('keeps deployment and installation paths scoped to GitHub Pages', () => {
    expect(pwaConfig.base).toBe('/ielts-wordflow/');
    expect(pwaConfig.manifest).toMatchObject({
      name: 'IELTS WordFlow',
      short_name: 'WordFlow',
      display: 'standalone',
      theme_color: '#174c3c',
      background_color: '#f5f0e6',
      start_url: '/ielts-wordflow/',
      scope: '/ielts-wordflow/',
    });
  });

  it('offers installable standard and maskable icon sizes', () => {
    expect(pwaConfig.manifest.icons).toEqual(expect.arrayContaining([
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
    ]));
  });

  it('ships nonempty PNG icon files at every declared size', () => {
    expect(pngDimensions('icons/icon-192.png')).toEqual({ width: 192, height: 192 });
    expect(pngDimensions('icons/icon-512.png')).toEqual({ width: 512, height: 512 });
    expect(pngDimensions('icons/maskable-512.png')).toEqual({ width: 512, height: 512 });
  });
});
