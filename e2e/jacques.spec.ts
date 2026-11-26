import { expect, test } from '@playwright/test';

// #57 : Jacques a dit, jeu de mouvement du catalogue.

test('Jacques a dit : ajouté du catalogue, piège ou pas dit d’emblée au parent', async ({
  page,
}) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Jacques a dit' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('link', { name: /Jacques a dit/ }).click();

  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  const parent = page.getByRole('region', { name: 'Pour le parent' });
  await expect(parent.getByText(/^(Piège !|Jacques a dit)$/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voir la réponse' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
});

test('Jacques a dit n’est pas proposé au Coucher', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Jacques a dit' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await expect(page.getByRole('link', { name: /Jacques a dit/ })).toBeVisible();
  await page.getByRole('button', { name: /La partie/ }).click();
  await page
    .getByRole('group', { name: 'Façon de jouer' })
    .getByText('Coucher', { exact: true })
    .click();
  await page.getByRole('button', { name: 'Fermer' }).click();
  await expect(page.getByRole('link', { name: /Jacques a dit/ })).toHaveCount(0);
});
