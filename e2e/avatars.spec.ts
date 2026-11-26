import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('choisir l’animal d’un enfant, le changer et le retrouver sur l’accueil', async ({ page }) => {
  await page.goto('./#/joueurs');
  await page.getByRole('button', { name: /Choisir l’avatar du nouveau joueur/ }).click();
  const dialog = page.getByRole('dialog', { name: 'L’animal de Nouveau joueur' });
  await dialog.getByRole('radio', { name: 'tortue' }).check();
  await dialog.getByRole('radio', { name: 'violet' }).check();
  await expect(dialog.getByRole('img', { name: 'Nouveau joueur, tortue' })).toBeVisible();

  // Le choix est lisible au lecteur d'écran et contrasté, en jour comme en nuit.
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    const results = await new AxeBuilder({ page })
      .include('dialog')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  }
  await dialog.getByRole('button', { name: 'C’est bon' }).click();

  await page.getByPlaceholder('Prénom').fill('Léa');
  await page.getByPlaceholder('Prénom').press('Enter');
  await page.getByRole('button', { name: 'Changer l’avatar de Léa, tortue' }).click();
  await page.getByRole('radio', { name: 'renard' }).check();
  await page.getByRole('button', { name: 'C’est bon' }).click();

  // Gardé sur le téléphone : toujours là après un rechargement.
  await page.goto('./#/');
  await page.reload();
  // Sur l'accueil, l'avatar est dans la pastille « Qui joue ? » (#37) du panneau « La partie ».
  await page.getByRole('button', { name: /La partie/ }).click();
  await expect(
    page
      .getByRole('button', { name: 'Léa', exact: true })
      .getByRole('img', { name: 'Léa, renard', includeHidden: true }),
  ).toBeVisible();
});
