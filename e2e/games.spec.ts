import { expect, test } from '@playwright/test';

test('Quelle chanson : l’extrait se joue et avance', async ({ page }) => {
  await page.goto('./#/jeu/chanson');
  await page.getByRole('button', { name: 'Écouter l’extrait' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText(/· 0:0[1-9]/, { timeout: 4000 });
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Écouter l’extrait' })).toBeVisible();
  await page.getByRole('button', { name: 'Voir la réponse' }).click();
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
});

test('Dessine ça : on dessine au doigt et on efface', async ({ page }) => {
  await page.goto('./#/jeu/dessin');
  const canvas = page.getByLabel('Zone de dessin');
  const box = (await canvas.boundingBox())!;
  const inked = () =>
    canvas.evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
      return n;
    });

  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 120, { steps: 10 });
  await page.mouse.up();
  expect(await inked()).toBeGreaterThan(500);

  await page.getByRole('button', { name: 'Tout effacer' }).click();
  expect(await inked()).toBe(0);
});

test('Quelle lettre : partie complète jusqu’au résultat', async ({ page }) => {
  await page.goto('./#/jeu/lettres');
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByRole('heading', { name: '10 étoiles gagnées ensemble !' })).toBeVisible();
  await page.getByRole('link', { name: 'Accueil' }).click();
  await expect(page.getByRole('heading', { name: 'On joue à quoi ?' })).toBeVisible();
});

test('Devinettes : un indice de plus à chaque appui, jamais la réponse', async ({ page }) => {
  await page.goto('./#/jeu/devinette');
  const parent = page.getByRole('region', { name: 'Pour le parent' });
  await expect(parent.getByText(/^Indice :/)).toHaveCount(1);
  const more = page.getByRole('button', { name: 'Encore un indice' });
  while (await more.isVisible()) await more.click();
  await expect(parent.getByText(/^Indice : Ça commence par « .+ »$/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voir la réponse' })).toBeVisible();
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByLabel('1 étoile')).toBeVisible();
});
