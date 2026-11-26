import { expect, test } from '@playwright/test';

// #47 : le parent choisit comment faire écouter l'air ; chaque façon s'explique en une phrase.
test('Quelle chanson : petit à petit, puis le rythme seul', async ({ page }) => {
  await page.goto('./#/jeu/chanson');
  await expect(page.getByRole('radio', { name: 'L’extrait' })).toBeChecked();

  await page.getByText('Petit à petit', { exact: true }).click();
  await expect(
    page.getByText('3 notes d’abord, puis 5, puis 10, puis tout l’extrait.'),
  ).toBeVisible();
  await expect(page.getByRole('status')).toContainText('3 premières notes');
  await page.getByRole('button', { name: 'Encore des notes' }).click();
  await expect(page.getByRole('status')).toContainText('5 premières notes');

  await page.getByText('Le rythme seul', { exact: true }).click();
  await expect(page.getByText(/on reconnaît l’air à son rythme/)).toBeVisible();

  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  await expect(page.getByLabel('1 étoile')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Le rythme seul' })).toBeChecked();
});
