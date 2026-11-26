import path from 'node:path';
import { expect, test } from '@playwright/test';

const PHOTO = path.join(import.meta.dirname, 'photo.png');

test('carte photo : le bouton ouvre le sélecteur, la photo s’affiche et s’enregistre', async ({
  page,
}) => {
  await page.goto('./#/ajouter');
  await page.getByLabel('Nom du jeu').fill('Ma maison');
  await page.getByText('Image', { exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter les questions' }).click();
  await expect(page.getByRole('heading', { name: 'Ma maison' })).toBeVisible();

  // Le sélecteur s'ouvre bien sur l'appui du parent.
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Ajouter une photo' }).click(),
  ]);
  expect(chooser.isMultiple()).toBe(false);
  await chooser.setFiles(PHOTO);
  await expect(page.locator('.item-form img')).toHaveJSProperty('complete', true);
  await expect(page.getByRole('button', { name: 'Changer la photo' })).toBeVisible();

  await page.getByLabel('Réponse').fill('La cuisine');
  await page.getByRole('button', { name: 'Ajouter la carte' }).click();
  await expect(page.getByText('1 carte')).toBeVisible();

  // La même photo peut servir à la carte suivante.
  const [again] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Ajouter une photo' }).click(),
  ]);
  await again.setFiles(PHOTO);
  await expect(page.getByRole('button', { name: 'Changer la photo' })).toBeVisible();
});

test('carte photo : un fichier illisible donne un message clair', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByLabel('Nom du jeu').fill('Photos');
  await page.getByText('Image', { exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter les questions' }).click();
  await page.getByLabel('Photo de la carte').setInputFiles({
    name: 'abimee.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('pas une image'),
  });
  await expect(page.getByRole('alert')).toContainText('ne peut pas être lue');
});
