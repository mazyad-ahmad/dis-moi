import { expect, test } from '@playwright/test';

// #127 : Tape les syllabes, ajouté du catalogue ; en Voiture, on compte à voix haute.

test('Tape les syllabes : ajouté du catalogue, joué en Voiture', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Tape les syllabes' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page
    .getByRole('group', { name: 'Façon de jouer' })
    .getByText('Voiture', { exact: true })
    .click();
  await page.getByRole('link', { name: /Tape les syllabes/ }).click();

  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
  const parent = page.getByRole('region', { name: 'Pour le parent' });
  await expect(parent.getByText(/\d syllabes?/).first()).toBeVisible();
  await expect(parent.getByText(/Sans taper|à voix haute/).first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Choix de l’enfant' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
});
