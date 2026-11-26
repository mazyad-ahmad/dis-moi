import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { storedSetting } from './storage';

// #123 : « Répondre en montrant », choisi sur l'accueil. L'enfant touche la réponse parmi
// quelques choix ; un mauvais choix ne fait rien, le bon est mis en valeur.

test('répondre en montrant : choix en grand, rien sur un mauvais choix', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByLabel('À voix haute')).toBeChecked();
  await page.getByText('En montrant', { exact: true }).click();
  await page.getByText('Petits', { exact: true }).click();
  await expect(page.getByText(/parmi 2 choix/)).toBeVisible();
  // Attendre que les deux réglages soient écrits dans IndexedDB avant de recharger.
  await expect.poll(() => storedSetting(page, 'showChoices')).toBe(true);
  await expect.poll(() => storedSetting(page, 'gameLevel')).toBe(1);

  // Gardé au rechargement, comme le niveau.
  await page.reload();
  await expect(page.getByLabel('En montrant')).toBeChecked();
  await expect(page.getByText(/parmi 2 choix/)).toBeVisible();

  await page.getByRole('link', { name: /Quelle lettre/ }).click();
  const board = page.getByRole('region', { name: 'Choix de l’enfant' });
  const choices = board.getByRole('button');
  await expect(choices).toHaveCount(2);

  // Cibles d'au moins 64 px pour un doigt d'enfant.
  for (const choice of await choices.all()) {
    const box = (await choice.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(64);
    expect(box.height).toBeGreaterThanOrEqual(64);
  }

  const asked = await page.locator('.parent-block strong').first().textContent();
  const glyph = asked!.trim().slice(-1);
  const right = board.getByRole('button', { name: `Lettre ${glyph}`, exact: true });
  const wrong = choices.filter({ hasNotText: glyph });

  await wrong.click();
  await expect(board.getByRole('status')).toHaveText('');
  await expect(board.locator('.is-right')).toHaveCount(0);

  await right.click();
  await expect(right).toHaveClass(/is-right/);
  await expect(board.getByRole('status')).toHaveText(`Oui, c’est ça : Lettre ${glyph} !`);

  // Le parent valide toujours la manche.
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`choix accessibles, thème ${colorScheme === 'light' ? 'jour' : 'nuit'}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('./');
    await page.getByText('En montrant', { exact: true }).click();
    await page.getByRole('link', { name: /Quelle chanson/ }).click();
    await expect(page.getByRole('region', { name: 'Choix de l’enfant' })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
}
