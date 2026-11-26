import { expect, test } from '@playwright/test';

test('Dessine ça : garder un dessin, le retrouver après redémarrage, le partager, le supprimer', async ({
  page,
}) => {
  await page.goto('./#/jeu/dessin');
  const word = (await page.locator('.word-card__word').textContent())!.trim();
  const canvas = page.getByLabel('Zone de dessin');
  const box = (await canvas.boundingBox())!;

  // Pas de bouton tant que rien n'est dessiné.
  await expect(page.getByRole('button', { name: 'Garder' })).toBeHidden();
  await page.mouse.move(box.x + 40, box.y + 60);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 160, { steps: 10 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Garder' }).click();
  await expect(page.getByRole('button', { name: 'Gardé' })).toBeDisabled();

  // Redémarrage : le dessin est dans la galerie, avec son mot.
  await page.reload();
  await page.goto('./#/parent');
  await page.getByRole('link', { name: /Dessins gardés/ }).click();
  const item = page.getByRole('button', { name: new RegExp(`^${word}, `) });
  await expect(item).toBeVisible();
  const thumb = item.locator('img');
  await expect(thumb).toHaveJSProperty('complete', true);
  expect(await thumb.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(100);

  // Rien ne part sans le geste du parent ; sans partage Android, l'image est téléchargée.
  await item.click();
  const viewer = page.getByRole('dialog', { name: word });
  await expect(viewer.getByRole('img', { name: `Dessin : ${word}` })).toBeVisible();
  const downloading = page.waitForEvent('download');
  await viewer.getByRole('button', { name: 'Partager l’image' }).click();
  expect((await downloading).suggestedFilename()).toMatch(/^dessin-.*\d{4}-\d\d-\d\d\.png$/);

  await viewer.getByRole('button', { name: 'Supprimer' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByText(/Aucun dessin pour l’instant/)).toBeVisible();
});
