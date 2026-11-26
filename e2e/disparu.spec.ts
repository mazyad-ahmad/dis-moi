import { expect, test } from '@playwright/test';

test('qu’est-ce qui a disparu : observer, cacher, remontrer, le parent valide', async ({
  page,
}) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Qu’est-ce qui a disparu ?' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('link', { name: /Qu’est-ce qui a disparu/ }).click();

  const question = page.getByRole('region', { name: 'Question' });
  const objects = page.getByRole('region', { name: 'Objets' }).getByRole('img');
  await expect(question).toContainText('Regarde bien tous les objets !');
  const before = await objects.count();
  expect(before).toBeGreaterThanOrEqual(3);

  // Rien n'avance tout seul : c'est le parent qui cache, puis remontre.
  await page.getByRole('button', { name: 'Cacher les objets' }).click();
  await expect(objects).toHaveCount(0);
  await expect(question).toContainText('Ferme les yeux !');
  await page.getByRole('button', { name: 'Remontrer les objets' }).click();
  await expect(question).toContainText('Qu’est-ce qui a disparu ?');
  await expect(objects).toHaveCount(before - 1);

  const parent = page.getByRole('region', { name: 'Pour le parent' });
  await parent.getByRole('button', { name: 'Voir la réponse' }).click();
  await expect(parent).toContainText(/\(.+\)/);
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  await expect(question).toContainText('Regarde bien tous les objets !');
});
