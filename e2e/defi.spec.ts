import { expect, test } from '@playwright/test';

// #43 : défi du jour, une carte surprise par jour, sans série ni reproche.

// Heure du téléphone : fuseau fixé pour que minuit tombe au bon moment.
test.use({ timezoneId: 'Europe/Paris' });

test('défi du jour : une étoile bonus, puis un nouveau défi après minuit', async ({
  page,
  baseURL,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-11-26T23:50:00+01:00') });
  const outside: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    if (/^https?:/.test(url) && !url.startsWith(new URL(baseURL!).origin)) outside.push(url);
  });

  await page.goto('./');
  const card = page.locator('.daily-tile');
  await expect(card).toContainText('Défi du jour');
  await card.click();

  await expect(page.getByText('Une carte surprise, la même toute la journée.')).toBeVisible();
  await page.getByRole('button', { name: /^(Trouvé|C'est fini)$/ }).click();
  await expect(page.getByRole('heading', { name: 'Défi réussi !' })).toBeVisible();
  await expect(page.getByText('Une étoile bonus gagnée ensemble.')).toBeVisible();

  await page.getByRole('link', { name: 'Accueil' }).click();
  await expect(card).toContainText('Réussi ! À demain.');
  await page.getByRole('link', { name: 'Étoiles', exact: true }).click();
  await expect(page.getByText('Défi du jour').first()).toBeVisible();
  await page.getByRole('link', { name: 'Jeux', exact: true }).click();

  // Minuit passe, appli ouverte : un nouveau défi, sans un mot sur la veille.
  await page.clock.runFor(15 * 60_000);
  await expect(page.getByRole('link', { name: /Défi du jour/ })).toBeVisible();
  await expect(card).toContainText('Une étoile bonus');

  expect(outside).toEqual([]);
});

test('le parent masque le défi du jour', async ({ page }) => {
  await page.goto('./#/parent/partie');
  await page.getByRole('group', { name: 'Défi du jour' }).getByText('Masqué').click();
  await page.getByRole('link', { name: 'Jeux', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'On joue à quoi ?' })).toBeVisible();
  await expect(page.locator('.daily-tile')).toHaveCount(0);
});
