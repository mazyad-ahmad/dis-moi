import { expect, test } from '@playwright/test';

test('la suite logique : ajouter le jeu, compléter la suite, le parent valide', async ({
  page,
}) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter La suite logique' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('link', { name: /La suite logique/ }).click();

  await expect(page.getByRole('region', { name: 'Question' })).toContainText(
    'Qu’est-ce qui vient ensuite ?',
  );
  const suite = page.getByRole('region', { name: 'Suite' });
  await expect(suite.getByRole('img', { name: 'Case vide' })).toBeVisible();
  // La suite tient dans la largeur de l'écran : rien à faire défiler de côté.
  const box = await suite.boundingBox();
  const width = page.viewportSize()!.width;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);

  const parent = page.getByRole('region', { name: 'Pour le parent' });
  await parent.getByRole('button', { name: 'Voir la réponse' }).click();
  await expect(parent).toContainText(/se répète|à chaque case/);
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
});
