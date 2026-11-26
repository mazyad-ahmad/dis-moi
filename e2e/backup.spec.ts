import path from 'node:path';
import { expect, test } from '@playwright/test';

test('sauvegarder tout, puis restaurer sur un téléphone vierge', async ({ page, browser }) => {
  // Un téléphone avec un joueur, un jeu créé avec photo, une partie et un réglage.
  await page.goto('./#/joueurs');
  await page.getByPlaceholder('Prénom').fill('Léa');
  await page.getByPlaceholder('Prénom').press('Enter');
  await expect(page.getByLabel('Prénom de Léa')).toBeVisible();

  await page.goto('./#/ajouter');
  await page.getByLabel('Nom du jeu').fill('Ma maison');
  await page.getByText('Image', { exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter les questions' }).click();
  await expect(page.getByRole('heading', { name: 'Ma maison' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles(path.join(import.meta.dirname, 'photo.png'));
  await page.getByLabel('Réponse').fill('La cuisine');
  await page.getByRole('button', { name: 'Ajouter la carte' }).click();
  await expect(page.getByText('1 carte')).toBeVisible();

  await page.goto('./#/parent/partie');
  await page.getByText('5', { exact: true }).click();
  await page.goto('./#/jeu/lettres');
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByRole('heading', { name: '5 étoiles gagnées ensemble !' })).toBeVisible();

  // Jeu créé et jamais sauvegardé : rappel discret dans l'espace Parent.
  await page.goto('./#/parent/appli');
  const reminder = page.getByText('Pense à les sauvegarder');
  await expect(reminder).toBeVisible();
  await expect(page.getByText('Aucune sauvegarde pour l’instant.', { exact: false })).toBeVisible();

  // Pas de partage Android dans Chromium de bureau : le fichier est téléchargé.
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sauvegarder tout (fichier)' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(
    /^dis-moi-\d{4}-\d\d-\d\d\.dismoi-sauvegarde\.json$/,
  );
  await expect(page.getByRole('status').filter({ hasText: 'téléchargements' })).toBeVisible();
  await expect(reminder).toBeHidden();
  await expect(page.getByText(/Dernière sauvegarde : \d+ \w+ \d{4}/)).toBeVisible();

  // Autre téléphone, vierge.
  const other = await browser.newContext({ ...test.info().project.use });
  const phone = await other.newPage();
  await phone.goto('./#/parent/appli');

  // Fichier invalide : message clair, rien ne change.
  await phone.getByLabel('Restaurer une sauvegarde').setInputFiles({
    name: 'jeu.dismoi.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"dis-moi/jeu","version":1}'),
  });
  await expect(phone.getByRole('alert')).toHaveText('Ce fichier n’est pas une sauvegarde Dis-moi.');

  await phone.getByLabel('Restaurer une sauvegarde').setInputFiles(await download.path());
  const choice = phone.getByRole('group', { name: /Sauvegarde du/ });
  await expect(choice).toContainText('1 joueur, 1 partie (5 étoiles), 1 jeu créé.');
  await choice.getByRole('button', { name: 'Tout remplacer' }).click();
  await expect(phone.getByRole('status').filter({ hasText: 'Sauvegarde restaurée' })).toBeVisible();
  await phone.goto('./#/parent/partie');
  await expect(phone.getByLabel('5', { exact: true })).toBeChecked();

  await phone.goto('./#/');
  await expect(phone.getByText('Léa')).toBeVisible();
  await phone.goto('./#/etoiles');
  await expect(phone.getByText('5 étoiles', { exact: true })).toBeVisible();
  await phone.goto('./#/ajouter');
  await phone.getByRole('link', { name: /Ma maison/ }).click();
  await expect(phone.getByText('La cuisine')).toBeVisible();
  await expect(phone.locator('.item-row img')).toHaveJSProperty('complete', true);
  expect(
    await phone.locator('.item-row img').evaluate((i: HTMLImageElement) => i.naturalWidth),
  ).toBe(64);
  await other.close();
});
