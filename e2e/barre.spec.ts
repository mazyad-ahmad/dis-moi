import { expect, test, type Page } from '@playwright/test';

/**
 * Barre du bas (#145) : seul l'écran défile, jamais le body. Sinon, sur Android,
 * la barre remonte avec le contenu et laisse une zone vide en dessous.
 */
async function scrollToBottom(page: Page) {
  // Défilement « au doigt » sur l'écran, puis butée tout en bas, sur l'écran et sur la page.
  await page.locator('.screen').hover();
  await page.mouse.wheel(0, 20_000);
  await page.evaluate(() => {
    const screen = document.querySelector('.screen')!;
    screen.scrollTop = screen.scrollHeight;
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
}

async function expectNavStuckToBottom(page: Page) {
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  await expect(nav).toBeVisible();
  const layout = await page.evaluate(() => {
    const nav = document.querySelector('.bottom-nav')!.getBoundingClientRect();
    const screen = document.querySelector('.screen')!;
    return {
      navBottom: nav.bottom,
      viewport: window.innerHeight,
      pageScroll: document.scrollingElement!.scrollTop,
      pageOverflow: document.documentElement.scrollHeight - window.innerHeight,
      screenAtEnd: Math.abs(screen.scrollHeight - screen.clientHeight - screen.scrollTop) <= 1,
    };
  });
  // La barre est collée au bas de l'écran…
  expect(Math.abs(layout.navBottom - layout.viewport)).toBeLessThanOrEqual(1);
  // … le body ne défile pas et n'a rien à faire défiler…
  expect(layout.pageScroll).toBe(0);
  expect(layout.pageOverflow).toBeLessThanOrEqual(0);
  // … et l'écran s'arrête à la fin de son contenu.
  expect(layout.screenAtEnd).toBe(true);
}

test('page Parent défilée jusqu’en bas : la barre reste collée en bas', async ({ page }) => {
  await page.goto('./#/parent');
  await expect(page.getByRole('link', { name: 'Confidentialité' })).toBeAttached();
  await scrollToBottom(page);
  await expect(page.getByRole('link', { name: 'Confidentialité' })).toBeInViewport();
  await expectNavStuckToBottom(page);
});

test('Accueil et Étoiles défilés jusqu’en bas : la barre reste collée en bas', async ({ page }) => {
  for (const path of ['/', '/etoiles']) {
    await page.goto(`./#${path}`);
    await expect(page.locator('.screen')).toBeVisible();
    await scrollToBottom(page);
    await expectNavStuckToBottom(page);
  }
});
