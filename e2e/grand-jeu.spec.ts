import { expect, test } from '@playwright/test';

test('Le Grand Jeu : un jeu différent à chaque manche, partie dans l’historique', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('link', { name: /Le Grand Jeu/ }).click();

  const titles: string[] = [];
  for (let i = 1; i <= 10; i++) {
    await expect(page.getByText(`Manche ${i} sur 10`)).toBeVisible();
    titles.push((await page.getByRole('heading', { level: 1 }).textContent())!);
    // L'écran-éclair passe tout seul ; un appui l'écourte.
    await page
      .getByRole('button', { name: /Maintenant : / })
      .click({ timeout: 500 })
      .catch(() => {});
    await page.getByRole('button', { name: /^(Trouvé|C'est fini)$/ }).click();
  }
  const games = titles.map((t) => t.replace('Quel chiffre ?', 'Quelle lettre ?'));
  games.forEach((t, i) => i > 0 && expect(t).not.toBe(games[i - 1]));
  await expect(page.getByRole('heading', { name: '10 étoiles gagnées ensemble !' })).toBeVisible();

  await page.goto('./#/etoiles');
  await expect(
    page.getByRole('region', { name: 'Dernières parties' }).getByText('Le Grand Jeu'),
  ).toBeVisible();
});
