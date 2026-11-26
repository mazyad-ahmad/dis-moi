import { expect, test } from '@playwright/test';

test('compte avec moi : ajouter le jeu, compter les objets, le parent valide', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Compte avec moi' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('link', { name: /Compte avec moi/ }).click();

  await expect(page.getByRole('region', { name: 'Question' })).toContainText(
    /Combien d|Où y en a-t-il le plus|ça fait combien|Combien en reste-t-il/,
  );
  const objects = page.getByRole('region', { name: 'Objets' });
  await expect(objects.getByRole('img').first()).toBeVisible();
  // Le champ tient dans la largeur de l'écran : rien à faire défiler de côté.
  const box = await objects.getByRole('img').first().boundingBox();
  const width = page.viewportSize()!.width;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);

  const parent = page.getByRole('region', { name: 'Pour le parent' });
  await parent.getByRole('button', { name: 'Voir la réponse' }).click();
  await expect(parent).toContainText(/\d/);
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
});
