import { expect, test } from '@playwright/test';

test('« Trouvé » : l’étoile s’envole, le compteur rebondit, la manche suit tout de suite', async ({
  page,
}) => {
  await page.goto('./#/jeu/lettres');
  await page.getByRole('button', { name: 'Trouvé' }).click();
  // Pas d'attente : la manche suivante est déjà là pendant que l'étoile vole.
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  await expect(page.getByLabel('1 étoile')).toHaveClass(/is-bumped/);
  const star = page.getByTestId('star-flight');
  await expect(star).toHaveCount(1);
  await expect(star).toHaveCount(0); // arrivée au compteur
});

test('fin de partie : des confettis qui ne gênent pas les boutons', async ({ page }) => {
  await page.goto('./#/jeu/lettres');
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByRole('heading', { name: '10 étoiles gagnées ensemble !' })).toBeVisible();
  await expect(page.getByTestId('confetti')).toBeAttached();
  await page.getByRole('button', { name: 'Rejouer' }).click();
  await expect(page.getByText('Manche 1 sur 10')).toBeVisible();
});

test('« réduire les animations » : aucun mouvement, tout reste lisible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/jeu/lettres');
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByLabel('1 étoile')).toBeVisible();
  await expect(page.getByTestId('star-flight')).toHaveCount(0);
  const moving = () =>
    page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  expect(await moving()).toBe(0);

  for (let i = 0; i < 9; i++) await page.getByRole('button', { name: 'Passer' }).click();
  await expect(page.getByRole('heading', { name: /gagnées ensemble/ })).toBeVisible();
  await expect(page.getByTestId('confetti')).toBeHidden();
  expect(await moving()).toBe(0);
});
