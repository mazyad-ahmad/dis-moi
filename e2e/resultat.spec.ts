import { expect, test } from '@playwright/test';

// #33 : écran de résultat vivant.

test('fin de partie : étoiles une à une, récompense fêtée une fois, un autre jeu', async ({
  page,
}) => {
  await page.goto('./#/jeu/lettres');
  for (let i = 0; i < 10; i++)
    await page.getByRole('button', { name: i < 3 ? 'Trouvé' : 'Passer' }).click();

  await expect(page.getByRole('heading', { name: '3 étoiles gagnées ensemble !' })).toBeVisible();
  const count = page.getByTestId('result-count');
  await expect(count).toHaveAttribute('aria-hidden', 'true');
  await expect(count.locator('svg')).toHaveCount(3);
  await expect(page.getByText('Nouvelle récompense : Première étoile !')).toBeVisible();
  await expect(page.getByText('Encore 7 étoiles pour la récompense « 10 étoiles ».')).toBeVisible();

  // Partie suivante : la première étoile n'est plus fêtée.
  await page.getByRole('button', { name: 'Rejouer' }).click();
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Passer' }).click();
  await expect(page.getByRole('heading', { name: 'Bravo d’avoir joué !' })).toBeVisible();
  await expect(page.getByTestId('result-count')).toHaveCount(0);
  await expect(page.getByText(/Nouvelle récompense/)).toHaveCount(0);
  await expect(page.getByText('Encore 7 étoiles pour la récompense « 10 étoiles ».')).toBeVisible();

  await page.getByRole('link', { name: 'Un autre jeu : Dessine ça' }).click();
  await expect(page.getByRole('heading', { name: 'Dessine ça' })).toBeVisible();
});
