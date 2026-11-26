import { expect, test } from '@playwright/test';

// #126 : Respire comme…, un exercice de respiration en images pour se calmer.

test('respire comme un ballon, puis une étoile gagnée ensemble', async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  const outside: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    if (/^https?:/.test(url) && !url.startsWith(new URL(baseURL!).origin)) outside.push(url);
  });

  await page.goto('./');
  await page.locator('.respire-card').getByRole('link', { name: 'Respirer' }).click();
  await expect(page.getByRole('heading', { name: 'Respire comme…' })).toBeVisible();
  await page.getByRole('button', { name: /Gonfle un ballon/ }).click();

  // Réduire les animations : la forme ne bouge pas, le texte guide.
  await expect(page.getByText('On s’installe…')).toBeVisible();
  await page.clock.runFor(1500);
  await expect(page.getByText('On inspire')).toBeVisible();
  await expect(page.getByTestId('respire-shape')).toHaveCSS('transform', 'none');
  await page.clock.runFor(3000);
  await expect(page.getByText('On souffle')).toBeVisible();

  // 10 respirations de 7 s, puis l'animation s'arrête (chaque temps est programmé au précédent).
  const done = page.getByRole('heading', { name: 'Tout calmes !' });
  await expect(async () => {
    await page.clock.runFor(4000);
    await expect(done).toBeVisible({ timeout: 200 });
  }).toPass({ timeout: 60_000, intervals: [0] });
  await expect(page.getByText(/Une étoile gagnée ensemble/)).toBeVisible();

  await page.getByRole('link', { name: 'Accueil' }).click();
  await page.getByRole('link', { name: 'Étoiles', exact: true }).click();
  await expect(page.getByText('Respire comme…').first()).toBeVisible();
  expect(outside).toEqual([]);
});
