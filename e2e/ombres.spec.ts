import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { storedSetting } from './storage';

// #61 : Ombres. L'emoji apparaît en silhouette, « Voir la réponse » le montre en couleur.

async function openOmbres(page: Page) {
  await page.goto('./#/ajouter');
  await page
    .getByRole('region', { name: 'Catalogue' })
    .getByRole('button', { name: 'Ajouter Ombres' })
    .click();
  await expect.poll(() => storedSetting(page, 'catalogue')).toContain('ombre');
  await page.goto('./');
  await page.getByRole('link', { name: /Ombres/ }).click();
  await expect(page.getByText('Manche 1 sur 10')).toBeVisible();
}

const filterOf = (page: Page, name: string) =>
  page.getByRole('img', { name }).evaluate((el) => getComputedStyle(el).filter);

for (const colorScheme of ['light', 'dark'] as const) {
  test(`Ombres : silhouette lisible, thème ${colorScheme === 'light' ? 'jour' : 'nuit'}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await openOmbres(page);
    // Noire le jour, claire la nuit : toujours contrastée avec le fond de la carte.
    expect(await filterOf(page, 'Ombre à deviner')).toBe(
      colorScheme === 'light' ? 'brightness(0) invert(0)' : 'brightness(0) invert(0.92)',
    );
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(axe.violations).toEqual([]);

    await page.getByRole('button', { name: 'Voir la réponse' }).click();
    // « Réduire les animations » : l'image est en couleur tout de suite, sans fondu.
    const image = page.getByRole('img', { name: 'Image à montrer' });
    expect(await image.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');
    expect(await filterOf(page, 'Image à montrer')).toBe('none');
    await page.getByRole('button', { name: 'Trouvé' }).click();
    await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  });
}

test('Ombres : la révélation se fait en fondu quand les animations sont permises', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openOmbres(page);
  const shadow = page.getByRole('img', { name: 'Ombre à deviner' });
  expect(await shadow.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0.8s');
  await page.getByRole('button', { name: 'Voir la réponse' }).click();
  await expect.poll(() => filterOf(page, 'Image à montrer')).toBe('none');
});
