import { expect, test } from '@playwright/test';

// #143 : après la remise à zéro, l'onglet Étoiles se remplit de nouveau, sans recharger.

test('remise à zéro, nouvelle partie, puis onglet Étoiles', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });

  // Une première partie : 2 étoiles.
  await page.goto('./#/jeu/lettres');
  for (let i = 0; i < 10; i++)
    await page.getByRole('button', { name: i < 2 ? 'Trouvé' : 'Passer' }).click();
  await expect(page.getByRole('heading', { name: '2 étoiles gagnées ensemble !' })).toBeVisible();
  await page.getByRole('link', { name: 'Accueil' }).click();
  await nav.getByRole('link', { name: 'Étoiles' }).click();
  await expect(page.getByText('2 étoiles', { exact: true })).toBeVisible();

  // Remise à zéro depuis l'espace Parent.
  await nav.getByRole('link', { name: 'Parent' }).click();
  await page.getByRole('button', { name: 'Remettre les étoiles à zéro' }).click();
  await page
    .getByRole('alertdialog', { name: 'Remettre les étoiles à zéro ?' })
    .getByRole('button', { name: 'Remettre à zéro' })
    .click();
  await expect(page.getByText('Les étoiles sont remises à zéro.')).toBeVisible();

  await nav.getByRole('link', { name: 'Étoiles' }).click();
  await expect(page.getByText("Pas encore d'étoiles")).toBeVisible();

  // Nouvelle partie, sans recharger l'appli : les étoiles s'affichent.
  await nav.getByRole('link', { name: 'Jeux' }).click();
  await page.getByRole('link', { name: /^Quelle lettre/ }).click();
  for (let i = 0; i < 10; i++)
    await page.getByRole('button', { name: i < 3 ? 'Trouvé' : 'Passer' }).click();
  await expect(page.getByRole('heading', { name: '3 étoiles gagnées ensemble !' })).toBeVisible();
  await page.getByRole('link', { name: 'Accueil' }).click();
  await nav.getByRole('link', { name: 'Étoiles' }).click();
  await expect(page.getByText('3 étoiles', { exact: true })).toBeVisible();
  await expect(page.getByText('gagnées ensemble en 1 partie')).toBeVisible();
  await expect(page.getByText("Pas encore d'étoiles")).toHaveCount(0);
});
