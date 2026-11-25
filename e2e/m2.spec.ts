import path from 'node:path';
import { expect, test } from '@playwright/test';

test('catalogue : ajouter Mime ça et y jouer', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Mime ça' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('link', { name: /Mime ça/ }).click();
  await expect(page.getByRole('img', { name: 'Image à montrer' })).toBeVisible();
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
});

test('créer un jeu avec une photo et un son, puis y jouer', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByLabel('Nom du jeu').fill('Ma maison');
  await page.getByText('Image', { exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter les questions' }).click();
  await expect(page.getByRole('heading', { name: 'Ma maison' })).toBeVisible();

  await page.locator('input[type=file]').setInputFiles(path.join(import.meta.dirname, 'photo.png'));
  await page.getByLabel('Réponse').fill('La cuisine');
  await page.getByRole('button', { name: 'Ajouter la carte' }).click();
  await expect(page.getByText('1 carte')).toBeVisible();

  // Les photos restent après rechargement (Blob dans IndexedDB).
  await page.reload();
  await expect(page.locator('.item-row img')).toHaveJSProperty('complete', true);
  expect(
    await page.locator('.item-row img').evaluate((i: HTMLImageElement) => i.naturalWidth),
  ).toBe(64);

  await page.getByRole('link', { name: 'Jouer' }).click();
  await expect(page.getByRole('img', { name: 'Image à montrer' })).toBeVisible();
  await page.getByRole('button', { name: 'Voir la réponse' }).click();
  await expect(page.getByText('La cuisine')).toBeVisible();
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByRole('heading', { name: '1 étoile gagnées ensemble !' })).toBeVisible();

  // Jeu de sons : enregistrement au micro (simulé).
  await page.goto('./#/ajouter');
  await page.getByLabel('Nom du jeu').fill('Quel bruit ?');
  await page.getByText('Son', { exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter les questions' }).click();
  await page.getByRole('button', { name: 'Enregistrer un son' }).click();
  await expect(page.getByRole('status')).toHaveText(/Enregistrement/);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Arrêter' }).click();
  await expect(page.getByLabel('Son enregistré')).toBeVisible();
  await page.getByLabel('Réponse').fill('Le micro');
  await page.getByRole('button', { name: 'Ajouter la carte' }).click();
  await expect(page.getByText('1 carte')).toBeVisible();
  await page.getByRole('link', { name: 'Jouer' }).click();
  await page.getByRole('button', { name: 'Écouter le son' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
});

test('étoiles et réglages', async ({ page }) => {
  await page.goto('./#/parent');
  await page.getByText('5', { exact: true }).click();
  await page.goto('./#/jeu/lettres');
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByRole('heading', { name: '5 étoiles gagnées ensemble !' })).toBeVisible();
  await page.getByRole('link', { name: 'Accueil' }).click();
  await expect(page.getByText(/Dernière partie aujourd’hui/)).toBeVisible();
  await page.getByRole('link', { name: 'Étoiles', exact: true }).click();
  await expect(page.getByText('5 étoiles', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Première étoile : gagnée')).toBeVisible();
});

test('partager un jeu créé dans un fichier, puis l’importer', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByLabel('Nom du jeu').fill('Chez mamie');
  await page.getByText('Image', { exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter les questions' }).click();
  await expect(page.getByRole('heading', { name: 'Chez mamie' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles(path.join(import.meta.dirname, 'photo.png'));
  await page.getByLabel('Réponse').fill('Le jardin');
  await page.getByRole('button', { name: 'Ajouter la carte' }).click();
  await expect(page.getByText('1 carte')).toBeVisible();

  // Pas de partage Android dans Chromium de bureau : le fichier est téléchargé.
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Partager le jeu (fichier)' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('chez-mamie.dismoi.json');
  await expect(page.getByRole('status').filter({ hasText: 'téléchargements' })).toBeVisible();

  // Fichier invalide : message clair, rien n'est créé.
  await page.goto('./#/ajouter');
  await page.getByLabel('Importer un jeu (fichier)').setInputFiles({
    name: 'autre.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"bonjour": 1}'),
  });
  await expect(page.getByRole('alert')).toHaveText('Ce fichier n’est pas un jeu Dis-moi.');

  await page.getByLabel('Importer un jeu (fichier)').setInputFiles(await download.path());
  await expect(page.getByRole('heading', { name: 'Chez mamie (2)' })).toBeVisible();
  await expect(page.getByText('Le jardin')).toBeVisible();
  await expect(page.locator('.item-row img')).toHaveJSProperty('complete', true);
  expect(
    await page.locator('.item-row img').evaluate((i: HTMLImageElement) => i.naturalWidth),
  ).toBe(64);
});
