import { expect, test } from '@playwright/test';

test('où ça va ? : ajouter le jeu, l’enfant range, le parent valide', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Où ça va ?' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('link', { name: /Où ça va \?/ }).click();

  // L'élément et la question avec ses familles, lue par le parent.
  await expect(page.getByRole('region', { name: 'Question' })).toContainText(/ ou .+ \?$/);
  const families = page.getByRole('list', { name: 'Familles' }).getByRole('listitem');
  await expect(families.first()).toBeVisible();
  expect(await families.count()).toBeGreaterThanOrEqual(2);

  const parent = page.getByRole('region', { name: 'Pour le parent' });
  await parent.getByRole('button', { name: 'Voir la réponse' }).click();
  await expect(parent.locator('.parent-block__talk')).not.toBeEmpty();
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
});
