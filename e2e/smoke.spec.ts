import { expect, test } from '@playwright/test';

test('parcours de base sur mobile', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'On joue à quoi ?' })).toBeVisible();

  await page.getByRole('link', { name: 'Ajouter', exact: true }).click();
  await page.getByPlaceholder('Prénom').fill('Léa');
  await page.getByRole('button', { name: 'Ajouter' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await expect(page.getByText('Léa', { exact: true })).toBeVisible();

  // Les données restent après rechargement (IndexedDB).
  await page.reload();
  await expect(page.getByText('Léa', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: /Quelle chanson/ }).click();
  await expect(page.getByRole('heading', { name: 'Quelle chanson ?' })).toBeVisible();
  await page.getByRole('link', { name: 'Quitter la partie' }).click();

  await page.getByRole('link', { name: 'Parent', exact: true }).click();
  await page.getByRole('link', { name: /Apparence/ }).click();
  await page.getByText('Nuit', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
});
