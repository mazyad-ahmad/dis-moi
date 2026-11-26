import { expect, test } from '@playwright/test';

// #124 : une phrase pour prolonger la discussion, montrée au parent après la réponse.
test('Devinettes : la phrase pour prolonger arrive avec la réponse', async ({ page }) => {
  await page.goto('./#/jeu/devinette');
  const parent = page.getByRole('region', { name: 'Pour le parent' });
  await expect(parent).toBeVisible();
  await expect(parent.getByText('Pour prolonger :')).toHaveCount(0);

  await page.getByRole('button', { name: 'Voir la réponse' }).click();
  await expect(parent.getByText('Pour prolonger :')).toBeVisible();
});
