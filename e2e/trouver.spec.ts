import { expect, test } from '@playwright/test';

// #137 : trouver le bon jeu. « Ajouter un jeu » groupe par type et filtre par type, âge et
// moment ; l'accueil met en haut les jeux des joueurs du jour.

test('Ajouter un jeu : filtres cumulés, retirés d’un geste', async ({ page }) => {
  await page.goto('./#/ajouter');
  const catalogue = page.getByRole('region', { name: 'Catalogue' });
  await expect(catalogue.getByRole('heading', { name: 'Bouger' })).toBeVisible();
  const add = catalogue.getByRole('button', { name: /^Ajouter / });
  await expect(add).toHaveCount(19);

  const parler = page.getByRole('group', { name: 'Type' }).getByRole('button', { name: 'Parler' });
  await parler.click();
  await expect(parler).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('group', { name: 'Moment' })
    .getByRole('button', { name: 'Pour la voiture' })
    .click();
  await expect(catalogue.getByRole('status')).toHaveText('7 jeux sur 19');
  await expect(catalogue.getByRole('button', { name: 'Ajouter Quelle couleur ?' })).toHaveCount(0);

  await parler.click();
  await expect(parler).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Retirer les filtres' }).click();
  await expect(add).toHaveCount(19);
});

test('jeu créé pour les grands : rangé sous « Pour d’autres âges » quand Léa a 3 ans', async ({
  page,
}) => {
  await page.goto('./#/joueurs');
  await page.getByPlaceholder('Prénom').fill('Léa');
  await page.getByRole('button', { name: 'Ajouter' }).click();
  await page
    .getByRole('group', { name: 'Niveau de Léa' })
    .getByText('Petits', { exact: true })
    .click();

  await page.goto('./#/ajouter');
  await page.getByLabel('Nom du jeu').fill('Quiz des grands');
  await page
    .getByRole('radiogroup', { name: 'Âge (facultatif)' })
    .getByText('7 ans et plus', { exact: true })
    .click();
  await page.getByRole('button', { name: 'Ajouter les questions' }).click();
  // Le formulaire de création a aussi un choix « Question » : on vise le champ de l'éditeur.
  await page.getByRole('textbox', { name: 'Question' }).fill('Capitale de la France ?');
  await page.getByRole('textbox', { name: 'Réponse' }).fill('Paris');
  await page.getByRole('button', { name: 'Ajouter la carte' }).click();

  await page.goto('./');
  const others = page.getByRole('region', { name: 'Pour d’autres âges' });
  await expect(others.getByRole('link', { name: /Quiz des grands/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Quelle lettre/ })).toBeVisible();
});
