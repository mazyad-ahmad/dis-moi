import { expect, test } from '@playwright/test';

// #125 : Raconte-moi, des questions ouvertes pour se parler, sans bonne réponse.

test('Raconte-moi en voiture : « Merci » donne l’étoile, « Passer » ne retire rien', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: /La partie/ }).click();
  await page
    .getByRole('group', { name: 'Façon de jouer' })
    .getByText('Voiture', { exact: true })
    .click();
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('link', { name: /Raconte-moi/ }).click();

  await expect(page.getByText('Manche 1 sur 10')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Question' })).toContainText('?');
  await expect(page.getByRole('button', { name: 'Trouvé' })).toHaveCount(0);
  await expect(
    page.getByText('Rien n’est enregistré, vos réponses restent entre vous.'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Merci de m’avoir raconté' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  await page.getByRole('button', { name: 'Passer' }).click();
  await expect(page.getByText('Manche 3 sur 10')).toBeVisible();
  await expect(page.getByLabel('1 étoile')).toBeVisible();
  for (let i = 3; i <= 9; i++) await page.getByRole('button', { name: 'Passer' }).click();
  await expect(page.getByText('Manche 10 sur 10')).toBeVisible();
  await page.getByRole('button', { name: 'Merci de m’avoir raconté' }).click();
  await expect(page.getByRole('heading', { name: '2 étoiles gagnées ensemble !' })).toBeVisible();
});

test('Raconte-moi au coucher : tout passer finit sur un mot doux', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /La partie/ }).click();
  await page
    .getByRole('group', { name: 'Façon de jouer' })
    .getByText('Coucher', { exact: true })
    .click();
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('link', { name: /Raconte-moi/ }).click();
  await expect(page.getByText(/Manche 1 sur/)).toBeVisible();
  const rounds = Number((await page.getByText(/Manche 1 sur/).textContent())!.match(/\d+$/)![0]);
  for (let i = 0; i < rounds; i++) await page.getByRole('button', { name: 'Passer' }).click();
  await expect(
    page.getByText('Merci pour ce moment ensemble. On se racontera d’autres choses !'),
  ).toBeVisible();
  await expect(page.getByText(/Pas d’étoile/)).toHaveCount(0);
});
