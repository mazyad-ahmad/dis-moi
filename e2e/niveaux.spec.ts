import { expect, test } from '@playwright/test';
import { storedSetting } from './storage';

// #40 : niveaux par âge. Le niveau de la partie se choisit sur l'accueil (Tous par défaut).

test('niveau Petits choisi sur l’accueil : les lettres des petits d’abord, gardé au rechargement', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: /La partie/ }).click();
  const tous = page.getByLabel('Tous', { exact: true });
  await expect(tous).toBeChecked();
  await page.getByText('Petits', { exact: true }).click();
  await expect(page.getByText('3-4 ans')).toBeVisible();
  // Attendre que le réglage soit écrit dans IndexedDB avant de recharger.
  await expect.poll(() => storedSetting(page, 'gameLevel')).toBe(1);

  await page.reload();
  await page.getByRole('button', { name: /La partie/ }).click();
  await expect(page.getByLabel('Petits', { exact: true })).toBeChecked();

  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('link', { name: /Quelle lettre/ }).click();
  for (let i = 0; i < 5; i++) {
    await expect(page.getByTestId('glyph')).toHaveText(/^[AEIOU]$/);
    await page.getByRole('button', { name: 'Trouvé' }).click();
  }
  // Plus de lettres pour les petits : le niveau voisin prend le relais.
  await expect(page.getByTestId('glyph')).toHaveText(/^[A-Z]$/);
  await expect(page.getByTestId('glyph')).not.toHaveText(/^[AEIOU]$/);
});

test('niveau de chaque joueur, facultatif', async ({ page }) => {
  await page.goto('./#/joueurs');
  await page.getByPlaceholder('Prénom').fill('Léa');
  await page.getByRole('button', { name: 'Ajouter' }).click();
  const group = page.getByRole('group', { name: 'Niveau de Léa' });
  await group.getByText('Grands', { exact: true }).click();
  await expect(group.getByLabel('Grands', { exact: true })).toBeChecked();
  await expect(group.getByText('7 ans et plus')).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('group', { name: 'Niveau de Léa' }).getByLabel('Grands', { exact: true }),
  ).toBeChecked();
});
