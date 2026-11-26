import { expect, test } from '@playwright/test';

/** Tirage imposé : une chanson avec paroles, puis un air sans paroles. */
const DRAW = [
  'une-souris-verte',
  'marche-turque',
  'frere-jacques',
  'au-clair-de-la-lune',
  'alouette',
  'douce-nuit',
  'vive-le-vent',
  'mon-beau-sapin',
  'ode-a-la-joie',
  'berceuse-de-brahms',
];

// #117 : une fois la chanson trouvée, on la chante ensemble, paroles à l'écran.
test('Quelle chanson : chanter ensemble, puis passer à la manche suivante', async ({ page }) => {
  await page.addInitScript((draw) => {
    sessionStorage.setItem('dis-moi:partie:chanson', JSON.stringify({ draw }));
  }, DRAW);
  await page.goto('./#/jeu/chanson');
  await expect(page.getByRole('button', { name: 'Chanter ensemble' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Voir la réponse' }).click();
  await page.getByRole('button', { name: 'Chanter ensemble' }).click();
  const sing = page.getByRole('region', { name: 'Chanter ensemble' });
  await expect(page.getByRole('region', { name: 'Extrait' })).toHaveCount(0);
  await expect(sing.getByRole('status')).toHaveText(/^Air en entier · 0:0[1-9]/, {
    timeout: 4000,
  });

  // Paroles en grand, avec le focus pour TalkBack.
  const lyrics = sing.getByRole('region', { name: 'Paroles' });
  await expect(lyrics).toBeFocused();
  await expect(lyrics).toContainText('Une souris verte');
  const size = await lyrics.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(22);

  // Chanter est un bonus : la manche suivante reste là, et coupe l'air.
  await page.getByRole('button', { name: 'Pas encore' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  await expect(sing).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Extrait' })).toBeVisible();

  // Un air sans paroles se joue quand même en entier.
  await page.getByRole('button', { name: 'Voir la réponse' }).click();
  await page.getByRole('button', { name: 'Chanter ensemble' }).click();
  await expect(sing.getByRole('status')).toHaveText(/^Air en entier · 0:0[1-9]/, {
    timeout: 4000,
  });
  await expect(sing.getByRole('region', { name: 'Paroles' })).toHaveCount(0);
  await expect(sing.getByText(/Pas de paroles pour cet air/)).toBeVisible();
});
