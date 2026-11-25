// Génère les icônes PNG de l'appli (manifest PWA) à partir du logo, avec Chromium (Playwright).
// Usage : node scripts/gen-icons.mjs
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const MIST = '#f5f4ee';
const LOGO =
  '<path d="M29 9a14 14 0 1 0 0 18" stroke="#2f6b4f"/><circle cx="18" cy="17" r="4.5" fill="#a8701c"/><path d="M12 25l5-5 4 3 4-4" stroke="#2e6f8e"/>';

/** Icône carrée : fond Mist, logo occupant `scale` de la largeur (zone sûre de 80 % pour maskable). */
function svg(size, scale, rounded) {
  const logo = size * scale;
  const offset = (size - logo) / 2;
  const radius = rounded ? size * 0.22 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" rx="${radius}" fill="${MIST}"/>
<g transform="translate(${offset} ${offset}) scale(${logo / 36})" fill="none" stroke-linecap="round" stroke-width="2.5">${LOGO}</g>
</svg>`;
}

const ICONS = [
  { file: 'icon-192.png', size: 192, scale: 0.72, rounded: true },
  { file: 'icon-512.png', size: 512, scale: 0.72, rounded: true },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.56, rounded: false },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.66, rounded: false },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, scale, rounded } of ICONS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}</style>${svg(size, scale, rounded)}`,
  );
  const png = await page.locator('svg').screenshot({ omitBackground: true });
  await writeFile(new URL(`../public/${file}`, import.meta.url), png);
  console.log(file);
}
await browser.close();
