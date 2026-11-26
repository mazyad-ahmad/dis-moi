import { expect, test } from '@playwright/test';

// #27 : verrou parent facultatif.

async function solve(page: import('@playwright/test').Page) {
  const input = page.getByRole('textbox', { name: /^Combien font \d+ plus \d+ \?$/ });
  const name = (await input.evaluate((el) => (el as HTMLInputElement).labels![0].textContent))!;
  const [, a, b] = /Combien font (\d+) plus (\d+)/.exec(name)!;
  await input.fill(String(Number(a) + Number(b)));
  await page.getByRole('button', { name: 'Entrer' }).click();
}

test('verrou actif : opération avant l’espace Parent, même par l’adresse', async ({ page }) => {
  await page.goto('./#/parent');
  await page.getByText('Activé', { exact: true }).click();

  // Fermer l'onglet oublie le déverrouillage.
  const fresh = await page.context().newPage();
  await fresh.goto('./#/joueurs');
  await expect(fresh.getByPlaceholder('Prénom')).toHaveCount(0);
  await solve(fresh);
  await expect(fresh.getByPlaceholder('Prénom')).toBeVisible();

  // Un rafraîchissement garde le déverrouillage.
  await fresh.reload();
  await expect(fresh.getByPlaceholder('Prénom')).toBeVisible();

  // Les jeux restent libres.
  const other = await page.context().newPage();
  await other.goto('./#/jeu/devinette');
  await expect(other.getByRole('button', { name: 'Trouvé' })).toBeVisible();
  await other.goto('./#/ajouter');
  await expect(other.getByRole('button', { name: 'Entrer' })).toBeVisible();
});
