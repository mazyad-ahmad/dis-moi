import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// #135 : Ni oui ni non. Le parent pose les questions, l'enfant répond sans dire oui ni non ;
// cinq questions tenues rapportent une étoile, un oui échappé fait rire et passe la manche.

test('ni oui ni non : cinq questions tenues, une étoile ; un oui, on rit', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Ni oui ni non' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('link', { name: /Ni oui ni non/ }).click();

  await expect(page.getByRole('region', { name: 'Question' })).toContainText(
    'Le parent pose la question',
  );
  await expect(page.getByText('Tenu : 0 sur 5')).toBeVisible();
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(axe.violations).toEqual([]);
  }

  const tenu = page.getByRole('button', { name: 'Tenu !' });
  for (let i = 1; i < 5; i++) {
    await tenu.click();
    await expect(page.getByText(`Tenu : ${i} sur 5`)).toBeVisible();
  }
  await tenu.click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  await expect(page.getByLabel('1 étoile')).toBeVisible();

  await page.getByRole('button', { name: 'Oups, un oui ou un non' }).click();
  await expect(page.getByText('Manche 3 sur 10')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('on rit');
  await page.getByText('Le parent répond').click();
  await expect(page.getByRole('region', { name: 'Question' })).toContainText(
    'L’enfant pose la question',
  );
});
