import { expect, test } from '@playwright/test';

test('Dessine ça : Dessin mystère, le mot se cache avant de rendre le téléphone', async ({
  page,
}) => {
  await page.goto('./#/jeu/dessin');
  const picker = page.getByRole('radiogroup', { name: 'Façon de jouer' });
  await picker.getByText('Mystère', { exact: true }).click();
  await expect(picker.getByRole('radio', { name: 'Mystère' })).toBeChecked();
  await expect(page.getByText(/c'est le parent qui devine/)).toBeVisible();

  const card = page.getByLabel('Mot à dessiner');
  const word = (await card.locator('.word-card__word').textContent())!.trim();
  await page.getByRole('button', { name: 'Cacher le mot' }).click();
  await expect(card.getByText(word, { exact: true })).toBeHidden();
  await expect(card.locator('.word-card__word')).toHaveText('Mot caché');

  // L'enfant dessine sur le même canvas, avec le même minuteur.
  await expect(page.getByRole('timer')).toBeVisible();
  const box = (await page.getByLabel('Zone de dessin').boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 60);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 160, { steps: 10 });
  await page.mouse.up();

  // Le parent propose, puis découvre le mot et valide.
  await page.getByRole('button', { name: 'Voir le mot' }).click();
  await expect(card.locator('.word-card__word')).toHaveText(word);
  await page.getByRole('button', { name: 'Deviné' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cacher le mot' })).toBeVisible();

  // À deux : la phrase sous le dessin dit à qui le tour.
  await picker.getByText('À deux', { exact: true }).click();
  await expect(page.getByText("Au tour de l'enfant : un trait")).toBeVisible();
});
