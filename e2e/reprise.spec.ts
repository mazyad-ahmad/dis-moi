import { expect, test } from '@playwright/test';

// #114 : un rafraîchissement en pleine partie la reprend là où elle en était.

test('Devinettes : même question, même manche, mêmes étoiles après un rafraîchissement', async ({
  page,
}) => {
  await page.goto('./#/jeu/devinette');
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await page.getByRole('button', { name: 'Pas encore' }).click();
  await expect(page.getByText('Manche 3 sur 10')).toBeVisible();
  const question = await page.locator('.deck-card__question').textContent();

  await page.reload();
  await expect(page.getByText('Manche 3 sur 10')).toBeVisible();
  await expect(page.getByLabel('1 étoile')).toBeVisible();
  await expect(page.locator('.deck-card__question')).toHaveText(question!);

  // Toujours la même partie : elle se termine à la manche 10.
  for (let i = 3; i <= 10; i++) await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByRole('heading', { name: '9 étoiles gagnées ensemble !' })).toBeVisible();
});

test('Dessine ça : même mot après « Autre mot » puis un rafraîchissement', async ({ page }) => {
  await page.goto('./#/jeu/dessin');
  await page.getByRole('button', { name: 'Autre mot' }).click();
  await page.getByRole('button', { name: "C'est fini" }).click();
  const word = await page.locator('.word-card__word').textContent();

  await page.reload();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  await expect(page.locator('.word-card__word')).toHaveText(word!);
});

test('revenir à l’accueil puis relancer le jeu donne une nouvelle partie', async ({ page }) => {
  await page.goto('./#/jeu/lettres');
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await page.getByRole('link', { name: 'Quitter la partie' }).click();
  await expect(page.getByRole('heading', { name: 'On joue à quoi ?' })).toBeVisible();
  await page.goto('./#/jeu/lettres');
  await expect(page.getByText('Manche 1 sur 10')).toBeVisible();
});
