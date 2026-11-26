import { expect, test } from '@playwright/test';

// #70 : Voix rigolotes, la phrase enregistrée est rejouée déformée, sur le téléphone.

test('Voix rigolotes : enregistrer, écouter la voix surprise, puis tout oublier', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('link', { name: /Voix rigolotes/ }).click();
  await expect(page.getByText('Manche 1 sur 10')).toBeVisible();
  await expect(page.getByText('Devine la voix')).toBeVisible();

  await page.getByRole('button', { name: 'Enregistrer la phrase' }).click();
  await expect(page.getByText(/On t’écoute/)).toBeVisible();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Arrêter' }).click();
  await page.getByRole('button', { name: 'Écouter la voix surprise' }).click();
  await page.getByRole('button', { name: 'Voir la voix' }).click();
  await expect(page.getByRole('group', { name: 'Réécouter avec une autre voix' })).toBeVisible();
  await page.getByRole('button', { name: /Écho/ }).click();

  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  await expect(page.getByLabel('1 étoile')).toBeVisible();
  // Manche suivante : l'enregistrement est oublié.
  await expect(page.getByRole('button', { name: 'Enregistrer la phrase' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Réenregistrer' })).toHaveCount(0);
  await expect(page.getByText(/Devine ma phrase/)).toBeVisible();

  await page.getByRole('button', { name: 'Enregistrer la phrase' }).click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Arrêter' }).click();
  await expect(page.getByText('La phrase est cachée')).toBeVisible();
  await page
    .getByRole('group', { name: 'Choisis une voix' })
    .getByRole('button', { name: /Souris/ })
    .click();
});

test('Voix rigolotes sans micro : on fait les voix soi-même', async ({ page }) => {
  await page.goto('./#/jeu/voix');
  await page.getByRole('button', { name: 'Jouer sans micro' }).click();
  const parent = page.getByRole('region', { name: 'Pour le parent' });
  await expect(parent).toContainText('Sans micro');
  await parent.getByRole('button', { name: 'Voir la voix à imiter' }).click();
  await expect(parent).toContainText(/Robot|Souris|Géant|Écho/);
  await page.getByRole('button', { name: 'Pas encore' }).click();
  await expect(page.getByRole('group', { name: 'Choisis une voix à imiter' })).toBeVisible();
});
