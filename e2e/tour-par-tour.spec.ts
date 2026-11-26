import { expect, test } from '@playwright/test';

test('chacun son tour : le prénom de l’enfant change à chaque manche', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Ajouter', exact: true }).click();
  for (const name of ['Léa', 'Sami', 'Noé']) {
    await page.getByPlaceholder('Prénom').fill(name);
    await page.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByLabel(`Prénom de ${name}`)).toBeVisible();
  }
  await page.getByRole('link', { name: 'Retour' }).click();

  // En équipe par défaut ; « Chacun son tour » se choisit sur l'accueil.
  await page.getByRole('button', { name: /La partie/ }).click();
  await expect(page.getByRole('radio', { name: 'En équipe' })).toBeChecked();
  await page.getByText('Chacun son tour').click();
  await expect(page.getByRole('radio', { name: 'Chacun son tour' })).toBeChecked();
  await page.getByRole('button', { name: 'Fermer' }).click();

  await page.getByRole('link', { name: /Quelle lettre/ }).click();
  const names: string[] = [];
  for (let round = 1; round <= 4; round++) {
    await expect(page.getByText(`Manche ${round} sur 10`)).toBeVisible();
    const turn = page.getByText(/^À toi,/);
    await expect(turn).toBeVisible();
    names.push((await turn.locator('strong').textContent())!);
    await page.getByRole('button', { name: 'Trouvé' }).click();
  }
  expect(new Set(names.slice(0, 3)).size).toBe(3);
  expect(names[3]).toBe(names[0]);

  // Le choix est gardé ; avec un seul joueur actif, on joue en équipe.
  await page.getByRole('link', { name: 'Quitter la partie' }).click();
  await page.getByRole('button', { name: /La partie/ }).click();
  const group = page.getByRole('group', { name: 'Qui joue ?' });
  await group.getByRole('button', { name: 'Sami' }).click();
  await group.getByRole('button', { name: 'Noé' }).click();
  await expect(page.getByRole('radio', { name: 'Normal' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Chacun son tour' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('link', { name: /Quelle lettre/ }).click();
  await expect(page.getByText('Manche 1 sur 10')).toBeVisible();
  await expect(page.getByText(/^À toi,/)).toHaveCount(0);
});
