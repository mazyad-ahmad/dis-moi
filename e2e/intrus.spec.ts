import { expect, test } from '@playwright/test';

test('l’intrus : ajouter le jeu, l’enfant montre, le parent valide', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter L’intrus' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('link', { name: /L’intrus/ }).click();

  await expect(page.getByRole('region', { name: 'Question' })).toContainText(
    'Laquelle ne va pas avec les autres ?',
  );
  const images = page.getByRole('region', { name: 'Images' }).getByRole('button');
  await expect(images).toHaveCount(4);

  // Toucher une image la met en avant, sans rien valider.
  await images.first().click();
  await expect(images.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Manche 1 sur 10')).toBeVisible();

  const parent = page.getByRole('region', { name: 'Pour le parent' });
  await parent.getByRole('button', { name: 'Voir la réponse' }).click();
  await expect(parent).toContainText(/à (gauche|droite)\)/);
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
});
