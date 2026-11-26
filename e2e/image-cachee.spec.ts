import path from 'node:path';
import { expect, test } from '@playwright/test';

const PHOTO = path.join(import.meta.dirname, 'photo.png');

test('image cachée : proposée à la création, la photo se dévoile palier par palier', async ({
  page,
}) => {
  await page.goto('./#/ajouter');
  await page.getByLabel('Nom du jeu').fill('Photos de famille');
  await page.getByText('Image', { exact: true }).click();
  await page.getByRole('radio', { name: 'Image cachée' }).check();
  await page.getByRole('button', { name: 'Ajouter les questions' }).click();
  await expect(page.getByRole('heading', { name: 'Photos de famille' })).toBeVisible();

  await page.getByLabel('Photo de la carte').setInputFiles(PHOTO);
  await expect(page.getByRole('button', { name: 'Changer la photo' })).toBeVisible();
  await page.getByLabel('Réponse').fill('Mamie');
  await page.getByRole('button', { name: 'Ajouter la carte' }).click();
  await expect(page.getByText('1 carte')).toBeVisible();
  await page.getByRole('link', { name: 'Jouer' }).click();

  // Premier palier : quelques carrés seulement, agrandis sans lissage.
  const hidden = page.getByRole('img', { name: 'Image à deviner, encore cachée' });
  await expect(hidden).toHaveJSProperty('width', 6);
  await expect(page.getByRole('status').filter({ hasText: 'Palier' })).toHaveText('Palier 1 sur 5');

  const more = page.getByRole('button', { name: 'Préciser l’image' });
  for (const width of [12, 24, 48]) {
    await more.click();
    await expect(hidden).toHaveJSProperty('width', width);
  }
  await more.click();

  // Dernier palier : la photo elle-même, nette.
  const sharp = page.getByRole('img', { name: 'Image à deviner, nette' });
  await expect(sharp).toHaveJSProperty('complete', true);
  await expect(more).toBeHidden();
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText(/gagnée/)).toBeVisible();
});

test('image cachée : activée pour un jeu du catalogue depuis l’espace Parent', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Quelle émotion ?' }).click();
  await page.goto('./#/parent/partie');
  const toggle = page.getByRole('button', { name: 'Image cachée : Quelle émotion ?' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await page.goto('./#/jeu/emotion');
  await expect(page.getByRole('img', { name: 'Image à deviner, encore cachée' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Préciser l’image' })).toBeVisible();
});
