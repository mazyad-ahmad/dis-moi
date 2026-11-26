import { expect, test } from '@playwright/test';

// #59 : Ça rime avec… et Les contraires, jeux de langage oraux du catalogue, jouables en Voiture.

for (const { name, question } of [
  { name: 'Ça rime avec…', question: /^Trouve un mot qui rime avec « .+ »\.$/ },
  { name: 'Les contraires', question: /^Le contraire de « .+ » \?$/ },
]) {
  test(`${name} : ajouté du catalogue, joué en Voiture`, async ({ page }) => {
    await page.goto('./#/ajouter');
    await page.getByRole('button', { name: `Ajouter ${name}` }).click();
    await page.getByRole('link', { name: 'Retour' }).click();
    await page.getByRole('button', { name: /La partie/ }).click();
    await page
      .getByRole('group', { name: 'Façon de jouer' })
      .getByText('Voiture', { exact: true })
      .click();
    await page.getByRole('button', { name: 'Fermer' }).click();
    await page.getByRole('link', { name: new RegExp(name) }).click();

    const card = page.getByRole('region', { name: 'Question' });
    await expect(card.getByText(question)).toBeVisible();
    const parent = page.getByRole('region', { name: 'Pour le parent' });
    await expect(parent.getByText(/^Indice : /)).toBeVisible();
    await page.getByRole('button', { name: 'Voir la réponse' }).click();
    // Plusieurs réponses acceptées, séparées par des virgules.
    await expect(parent.locator('.parent-block__answer')).toHaveText(/\S+, \S+/);
    await page.getByRole('button', { name: 'Trouvé' }).click();
    await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  });
}
