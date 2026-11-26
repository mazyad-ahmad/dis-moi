import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// #134 : Devine avec tes mains. Le rappel de sécurité d'abord, la liste du sac, puis les manches.

test('devine avec tes mains : sécurité, liste, puis on devine au toucher', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Devine avec tes mains' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('link', { name: /Devine avec tes mains/ }).click();

  const safety = page.getByRole('note', { name: 'Sécurité d’abord' });
  await expect(safety).toContainText('4 cm');
  await expect(safety).toContainText('Pas de pile');
  await expect(page.getByRole('region', { name: 'Dans le sac' }).getByRole('listitem')).toHaveCount(
    6,
  );
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(axe.violations).toEqual([]);
  }
  await page.getByRole('button', { name: 'C’est parti' }).click();

  await expect(page.getByRole('region', { name: 'Manche' })).toContainText('Touche sans regarder');
  await expect(page.getByText('Manche 1 sur 6')).toBeVisible();
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 6')).toBeVisible();
  await page.getByRole('button', { name: 'Pas encore' }).click();
  await expect(page.getByText('Manche 3 sur 6')).toBeVisible();
});
