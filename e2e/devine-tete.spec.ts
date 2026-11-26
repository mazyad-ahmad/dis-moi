import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// #67 : Devine-tête. Le mot en grand pour les autres ; inclinaison facultative, boutons toujours là.

test('devine-tête : ajouter le jeu, la règle d’abord, puis jouer avec les boutons', async ({
  page,
}) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Devine-tête' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('link', { name: /Devine-tête/ }).click();

  // L'explication vient avant tout : rien n'est demandé au téléphone sans elle.
  const intro = page.getByRole('region', { name: 'Comment on joue' });
  await expect(intro).toContainText('sur son front');
  await expect(intro).toContainText('rien n’est enregistré ni envoyé');
  await intro.getByRole('button', { name: 'Jouer avec les boutons' }).click();

  await expect(page.getByRole('region', { name: 'Mot à faire deviner' })).toContainText('Idée :');
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(axe.violations).toEqual([]);
  }
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  await page.getByRole('button', { name: 'Passer' }).click();
  await expect(page.getByText('Manche 3 sur 10')).toBeVisible();
});
