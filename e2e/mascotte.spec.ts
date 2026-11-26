import { expect, test, type Page } from '@playwright/test';

const mascotMoving = (page: Page) =>
  page.evaluate(
    () =>
      document
        .querySelector('[data-testid="mascot"]')
        ?.getAnimations({ subtree: true })
        .filter((a) => a.playState === 'running').length ?? -1,
  );

test('accueil : la mascotte dit bonjour, décorative et dessinée en ligne', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('./');
  const mascot = page.getByTestId('mascot');
  await expect(mascot).toBeVisible();
  await expect(mascot).toHaveAttribute('data-mood', 'hello');
  await expect(mascot).toHaveAttribute('aria-hidden', 'true');
  expect(await page.locator('img').count()).toBe(0);
  expect(await mascotMoving(page)).toBeGreaterThan(0);
});

test('thème nuit : la mascotte dort', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./');
  await expect(page.getByTestId('mascot')).toHaveAttribute('data-mood', 'sleep');
});

test('jamais pendant la manche, bravo à la fin', async ({ page }) => {
  await page.goto('./#/jeu/lettres');
  for (let i = 0; i < 10; i++) {
    await expect(page.getByTestId('mascot')).toHaveCount(0);
    await page.getByRole('button', { name: 'Trouvé' }).click();
  }
  await expect(page.getByRole('heading', { name: '10 étoiles gagnées ensemble !' })).toBeVisible();
  await expect(page.getByTestId('mascot')).toHaveAttribute('data-mood', 'bravo');
});

test('« réduire les animations » : la mascotte reste immobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.getByTestId('mascot')).toBeVisible();
  expect(await mascotMoving(page)).toBe(0);
});
