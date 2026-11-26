import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// #120 : fin de séance en douceur.

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

async function playLetters(page: Page) {
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Trouvé' }).click();
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`séance terminée : on range, même après un rafraîchissement (${colorScheme})`, async ({
    page,
  }) => {
    await page.clock.install();
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('./#/parent/partie');
    await page
      .getByRole('group', { name: 'Manches par partie' })
      .getByText('5', { exact: true })
      .click();
    await page.goto('./#/parent/temps');
    await page
      .getByRole('group', { name: 'Durée d’une séance' })
      .getByText('10', { exact: true })
      .click();

    await page.goto('./#/jeu/lettres');
    await playLetters(page);
    await page.clock.fastForward('12:00');
    await page.getByRole('button', { name: 'Rejouer' }).click();

    // L'échéance est passée : cette partie est la dernière, et va jusqu'au bout.
    await expect(page.getByText('Dernière partie, et après on range.')).toBeVisible();
    await playLetters(page);
    await expect(page.getByRole('heading', { name: 'C’était la dernière partie !' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rejouer' })).toHaveCount(0);
    await axe(page);

    await page.getByRole('link', { name: 'À plus tard' }).click();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Revenir plus tard' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Quelle lettre/ })).toHaveCount(0);
    await axe(page);
  });
}
