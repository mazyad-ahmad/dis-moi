import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// #133 : Que fais-tu si… ? Une petite situation, pas de bonne réponse : on en parle ensemble.

test('Que fais-tu si… ? en voiture : des pistes pour le parent, l’étoile pour avoir parlé', async ({
  page,
}) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Que fais-tu si… ?' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page
    .getByRole('group', { name: 'Façon de jouer' })
    .getByText('Voiture', { exact: true })
    .click();
  await page.getByRole('link', { name: /Que fais-tu si/ }).click();

  await expect(page.getByText('Manche 1 sur 10')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Situation' })).toContainText('Que fais-tu ?');
  await expect(page.getByRole('button', { name: 'Trouvé' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Voir des pistes' }).click();
  await expect(page.getByRole('list', { name: 'Pistes' })).toBeVisible();
  await expect(page.getByText('Pour en parler :')).toBeVisible();
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(axe.violations).toEqual([]);
  }

  await page.getByRole('button', { name: 'On en a parlé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  await expect(page.getByLabel('1 étoile')).toBeVisible();
  await page.getByRole('button', { name: 'Passer' }).click();
  await expect(page.getByText('Manche 3 sur 10')).toBeVisible();
  await expect(page.getByLabel('1 étoile')).toBeVisible();
});
