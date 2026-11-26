import { expect, test } from '@playwright/test';

// #48 : écritures (minuscules, attaché), nombres, constellations et mélange dans Quelle lettre ?

test('le sélecteur tient sur un petit écran, l’attaché a sa police, hors ligne', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('./');
  await page.getByRole('link', { name: /Quelle lettre/ }).click();

  const picker = page.getByRole('radiogroup', { name: 'Que montrer ?' });
  const labels = ['Majuscules', 'Minuscules', 'Attaché', 'Chiffres', 'Nombres', 'Dés, doigts'];
  // Chaque bouton : visible en entier, assez grand pour le pouce, sans défilement horizontal.
  for (const name of [...labels, 'Mélange']) {
    const box = (await picker.getByText(name, { exact: true }).locator('..').boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  await page.getByText('Attaché', { exact: true }).click();
  const glyph = page.getByTestId('glyph');
  await expect(glyph).toHaveText(/^[a-z]$/);
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('128px "Playwrite FR Moderne"', 'a')))
    .toBe(true);
  // La police vient de l'appli, pas d'un serveur de polices.
  const fontUrls = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .filter((n) => /woff2?/.test(n)),
  );
  for (const url of fontUrls) expect(new URL(url).origin).toBe(new URL(page.url()).origin);

  await page.getByText('Dés, doigts', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Combien ?' })).toBeVisible();
  await expect(glyph).toHaveAccessibleName(/^\d+ (points?|doigts?)$/);

  await page.getByText('Nombres', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quel nombre ?' })).toBeVisible();
  await expect(glyph).toHaveText(/^\d{2,3}$/);

  await page.getByText('Mélange', { exact: true }).click();
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  await expect(page.getByLabel('1 étoile')).toBeVisible();
});
