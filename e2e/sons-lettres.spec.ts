import { expect, test } from '@playwright/test';

// #50 : le son des lettres, écrit pour le parent, avec trois mots illustrés et une question.
// Sans voix du téléphone (Chromium sans tête), le jeu reste jouable par la lecture du parent.
test('Quelle lettre : le son, trois mots et une question, d’une manche à l’autre', async ({
  page,
}) => {
  await page.goto('./#/jeu/lettres');
  const parent = page.getByRole('region', { name: 'Pour le parent' });
  for (let round = 1; round <= 2; round++) {
    await expect(page.getByText(new RegExp(`^Manche ${round}`))).toBeVisible();
    await expect(parent.getByText('Le son :')).toBeVisible();
    await expect(
      parent.getByRole('list', { name: 'Mots du son' }).getByRole('listitem'),
    ).toHaveCount(3);
    await expect(parent.getByText(/^Demande :/)).toBeVisible();
    await page.getByRole('button', { name: 'Trouvé' }).click();
  }

  await page.getByLabel('Chiffres').check();
  await expect(parent.getByText('Le son :')).toHaveCount(0);
});
