import { expect, test } from '@playwright/test';

// #56 : Vrai ou faux rigolo, jeu oral du catalogue, jouable en Voiture.

test('Vrai ou faux rigolo : ajouté du catalogue, joué en Voiture', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Vrai ou faux rigolo' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('button', { name: /La partie/ }).click();
  await page
    .getByRole('group', { name: 'Façon de jouer' })
    .getByText('Voiture', { exact: true })
    .click();
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('link', { name: /Vrai ou faux rigolo/ }).click();

  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  await page.getByRole('button', { name: 'Voir la réponse' }).click();
  await expect(page.getByText(/^(Vrai|Faux) ! /)).toBeVisible();
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
});

test('Vrai ou faux rigolo, en montrant : deux choix, Vrai et Faux', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Vrai ou faux rigolo' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('button', { name: /La partie/ }).click();
  await page.getByText('En montrant', { exact: true }).click();
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('link', { name: /Vrai ou faux rigolo/ }).click();
  const board = page.getByRole('region', { name: 'Choix de l’enfant' });
  await expect(board.getByRole('button')).toHaveCount(2);
  await expect(board.getByRole('button', { name: 'Vrai' })).toBeVisible();
  await expect(board.getByRole('button', { name: 'Faux' })).toBeVisible();
});
