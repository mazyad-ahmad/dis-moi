import { expect, test } from '@playwright/test';

test('en équipes : invités ajoutés à la volée, équipes à tour de rôle', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Ajouter', exact: true }).click();
  await page.getByPlaceholder('Prénom').fill('Léa');
  await page.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByLabel('Prénom de Léa')).toBeVisible();
  await page.getByRole('link', { name: 'Retour' }).click();

  await page.getByRole('button', { name: /La partie/ }).click();
  await page.getByRole('link', { name: 'Jouer en équipes' }).click();
  for (const name of ['Tom', 'Zoé', 'Inès']) {
    await page.getByPlaceholder('Prénom de l’invité').fill(name);
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page.getByRole('button', { name: `${name} : changer d’équipe` })).toBeVisible();
  }
  await expect(page.getByText('Ajouter des enfants (4 sur 12)')).toBeVisible();
  await page.getByRole('button', { name: 'C’est parti !' }).click();
  await expect(page.getByText('Les Renards, Les Grenouilles')).toBeVisible();

  await page.getByRole('link', { name: /Quelle lettre/ }).click();
  const names: string[] = [];
  for (let round = 1; round <= 3; round++) {
    await expect(page.getByText(`Manche ${round} sur 10`)).toBeVisible();
    const turn = page.getByText(/^À vous,/);
    await expect(turn).toBeVisible();
    names.push((await turn.locator('strong').textContent())!);
    await page.getByRole('button', { name: 'Trouvé' }).click();
  }
  expect(names[1]).not.toBe(names[0]);
  expect(names[2]).toBe(names[0]);

  // Les invités ne sont pas des joueurs de la famille.
  await page.getByRole('link', { name: 'Quitter la partie' }).click();
  await page.getByRole('button', { name: /La partie/ }).click();
  await page.getByRole('link', { name: 'Modifier', exact: true }).click();
  await expect(page.getByLabel('Prénom de Léa')).toBeVisible();
  await expect(page.getByLabel('Prénom de Tom')).toHaveCount(0);
});
