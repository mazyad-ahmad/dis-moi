import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { storedSetting } from './storage';

// #58 : Les émotions. Reconnaître l'émotion d'un visage, ou la mimer pour que le parent
// devine ; une question pour en parler ensemble attend le parent avec la réponse.

test('Quelle émotion ? : ajouté depuis le catalogue, joué avec une question pour en parler', async ({
  page,
}) => {
  await page.goto('./#/ajouter');
  const catalogue = page.getByRole('region', { name: 'Catalogue' });
  await catalogue.getByRole('button', { name: 'Ajouter Quelle émotion ?' }).click();
  await catalogue.getByRole('button', { name: 'Ajouter Mime l’émotion' }).click();
  await expect.poll(() => storedSetting(page, 'catalogue')).toContain('emotion-mime');

  await page.goto('./');
  await page.getByRole('link', { name: /Quelle émotion/ }).click();
  await expect(page.getByText('Manche 1 sur 10')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Image à montrer' })).toBeVisible();
  await expect(page.getByText(/Pour en parler/)).toHaveCount(0);

  await page.getByRole('button', { name: 'Voir la réponse' }).click();
  await expect(page.getByText(/Pour en parler/)).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();

  // L'autre sens : l'enfant mime, le parent devine.
  await page.goto('./');
  await page.getByRole('link', { name: /Mime l’émotion/ }).click();
  await expect(page.getByText("Montre l'écran à l'enfant")).toBeVisible();
  await expect(page.getByText(/^Fais |^Montre avec|^Respire/)).toBeVisible();
});
