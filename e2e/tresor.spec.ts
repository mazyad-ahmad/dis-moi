import { expect, test } from '@playwright/test';

test('chasse au trésor : ajouter le jeu, chercher partout puis sans courir', async ({ page }) => {
  await page.clock.install();
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Chasse au trésor' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('link', { name: /Chasse au trésor/ }).click();

  const card = page.getByRole('region', { name: 'Consigne' });
  await expect(card).toContainText('Trouve quelque chose');
  await expect(card).toContainText('reviens le montrer');

  // Minuteur doux : à zéro, rien n'est perdu, le parent décide.
  await page.getByRole('button', { name: 'Lancer le minuteur (1:00)' }).click();
  await expect(page.getByRole('timer')).toHaveText('1:00');
  await page.clock.runFor(61_000);
  await expect(page.getByRole('timer')).toHaveAccessibleName('Temps écoulé');
  await expect(page.getByText('le parent décide')).toBeVisible();
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();

  await page.getByText('Sans courir', { exact: true }).click();
  await expect(card).toContainText('Sans te lever');
  await expect(page.getByRole('button', { name: 'Lancer le minuteur (0:30)' })).toBeVisible();
  await page.getByRole('button', { name: 'Pas encore' }).click();
  await expect(page.getByText('Manche 3 sur 10')).toBeVisible();
});
