import { expect, test } from '@playwright/test';

// #68 : Histoire à inventer, un héros, un lieu et un objet pour lancer une histoire.

test('Histoire à inventer en voiture : trois images, « Merci » donne l’étoile', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: /La partie/ }).click();
  await page
    .getByRole('group', { name: 'Façon de jouer' })
    .getByText('Voiture', { exact: true })
    .click();
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('link', { name: /Histoire à inventer/ }).click();

  await expect(page.getByText('Manche 1 sur 5')).toBeVisible();
  const card = page.getByRole('region', { name: 'Histoire' });
  for (const role of ['Un héros', 'Un lieu', 'Un objet'])
    await expect(card.getByText(role)).toBeVisible();
  await expect(card.getByText(/^Il était une fois /)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Pour le parent' })).toContainText('Et après ?');
  await expect(page.getByRole('button', { name: 'Trouvé' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Merci pour ton histoire' }).click();
  await expect(page.getByText('Manche 2 sur 5')).toBeVisible();
  await page.getByRole('button', { name: 'Passer' }).click();
  await expect(page.getByText('Manche 3 sur 5')).toBeVisible();
  await expect(page.getByLabel('1 étoile')).toBeVisible();
});

test('le parent enregistre une histoire, la réécoute puis la supprime du livre', async ({
  page,
}) => {
  await page.goto('./#/jeu/histoire');
  await expect(page.getByText('Manche 1 sur 5')).toBeVisible();
  const word = await page.locator('.story-part__word').first().textContent();

  await page.getByRole('button', { name: 'Enregistrer l’histoire' }).click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Arrêter l’enregistrement' }).click();
  await expect(page.getByRole('button', { name: 'Réécouter l’histoire' })).toBeVisible();
  await expect(page.getByText('Gardée dans le Livre d’histoires (espace Parent).')).toBeVisible();

  await page.goto('./#/parent/sons');
  const book = page.getByRole('list', { name: 'Histoires enregistrées' });
  await expect(book.getByText(word!, { exact: false })).toBeVisible();
  await expect(book.getByRole('button', { name: /^Écouter l’histoire/ })).toBeVisible();
  await book.getByRole('button', { name: /^Supprimer l’histoire/ }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByText(/Pas encore d’histoire/)).toBeVisible();
});
