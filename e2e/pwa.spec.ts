import { expect, test } from '@playwright/test';

test('manifest installable : nom, icônes, plein écran portrait', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({
    short_name: 'Dis-moi',
    display: 'standalone',
    orientation: 'portrait',
    start_url: './',
    lang: 'fr',
  });
  const sizes = manifest.icons.map((i: { sizes: string; purpose: string }) => i.sizes + i.purpose);
  expect(sizes).toEqual(expect.arrayContaining(['192x192any', '512x512any', '512x512maskable']));
  for (const icon of manifest.icons) {
    const res = await request.get(icon.src);
    expect(res.headers()['content-type']).toBe('image/png');
  }
});

test('hors ligne : l’appli se recharge et se joue sans réseau', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'On joue à quoi ?' })).toBeVisible();
  // Le service worker a fini de tout mettre en cache et contrôle la page.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'On joue à quoi ?' })).toBeVisible();
  // Polices embarquées servies depuis le cache.
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('500 36px Fraunces')))
    .toBe(true);

  await page.getByRole('link', { name: /Quelle lettre/ }).click();
  await expect(page.getByTestId('glyph')).toBeVisible();
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText(/Manche 2/)).toBeVisible();
});

test('aucune requête vers un autre site', async ({ page }) => {
  const origin = 'http://localhost:4173';
  const outside: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== origin) outside.push(r.url());
  });
  await page.goto('./');
  await page.getByRole('link', { name: /Quelle chanson/ }).click();
  await page.getByRole('link', { name: 'Quitter la partie' }).click();
  await page.getByRole('link', { name: 'Parent', exact: true }).click();
  await page.getByRole('link', { name: 'Confidentialité' }).click();
  await expect(page.getByRole('heading', { name: 'Confidentialité' })).toBeVisible();
  expect(outside).toEqual([]);
});
