import { expect, test } from '@playwright/test';

// #42 : façons de jouer, choisies sur l'accueil (Normal par défaut).

test('Voiture : seulement des jeux oraux, gardé au rechargement', async ({ page }) => {
  await page.goto('./');
  const modes = page.getByRole('group', { name: 'Façon de jouer' });
  await expect(modes.getByLabel('Normal', { exact: true })).toBeChecked();
  await modes.getByText('Voiture', { exact: true }).click();
  await expect(page.getByText('Tout à l’oral, rien à regarder.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Quelle chanson/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Quelle lettre/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Dessine ça/ })).toHaveCount(0);

  await page.reload();
  await expect(
    page.getByRole('group', { name: 'Façon de jouer' }).getByLabel('Voiture', { exact: true }),
  ).toBeChecked();
});

test('Express : 3 manches, notées dans l’historique', async ({ page }) => {
  await page.goto('./');
  await page
    .getByRole('group', { name: 'Façon de jouer' })
    .getByText('Express', { exact: true })
    .click();
  await page.getByRole('link', { name: /Quelle lettre/ }).click();
  for (let i = 1; i <= 3; i++) {
    await expect(page.getByText(`Manche ${i} sur 3`)).toBeVisible();
    await page.getByRole('button', { name: 'Trouvé' }).click();
  }
  await expect(page.getByRole('heading', { name: '3 étoiles gagnées ensemble !' })).toBeVisible();
  await page.getByRole('link', { name: 'Accueil' }).click();
  await page.getByRole('link', { name: 'Étoiles' }).click();
  await expect(
    page.getByRole('region', { name: 'Dernières parties' }).getByText(/Express/),
  ).toBeVisible();
});

test('Coucher : thème nuit, dessin sans minuteur', async ({ page }) => {
  await page.goto('./');
  await page
    .getByRole('group', { name: 'Façon de jouer' })
    .getByText('Coucher', { exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await page.getByRole('link', { name: /Dessine ça/ }).click();
  await expect(page.getByText(/^Manche 1 sur/)).toBeVisible();
  await expect(page.getByRole('timer')).toHaveCount(0);
});
