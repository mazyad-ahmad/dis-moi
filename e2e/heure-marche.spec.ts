import { expect, test, type Locator } from '@playwright/test';

// #136 : Quelle heure est-il ? et Le petit marché, deux jeux du catalogue pour les grands.

/** Contraste WCAG entre deux couleurs CSS « rgb(r, g, b) ». */
function contrast(a: string, b: string): number {
  const lum = (c: string) => {
    const [r, g, bl] = c
      .match(/\d+(\.\d+)?/g)!
      .slice(0, 3)
      .map(Number);
    const lin = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const style = (el: Locator, prop: 'fill' | 'stroke') =>
  el.evaluate((node, p) => getComputedStyle(node).getPropertyValue(p), prop);

// La manche glisse depuis la droite en arrivant (240 ms) : on mesure une fois posée.
async function inScreen(page: import('@playwright/test').Page, el: Locator) {
  const width = page.viewportSize()!.width;
  await expect
    .poll(async () => {
      const box = (await el.boundingBox())!;
      return box.x >= 0 && box.x + box.width <= width;
    })
    .toBe(true);
}

test('quelle heure est-il : une horloge lisible en mode sombre, le parent valide', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Quelle heure est-il ?' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('link', { name: /Quelle heure est-il/ }).click();

  const clock = page.getByRole('img', { name: 'Horloge à aiguilles' });
  await expect(clock).toBeVisible();
  await inScreen(page, clock);
  const face = clock.locator('.heure-clock__face');
  const number = clock.locator('.heure-clock__number').first();
  const hour = clock.locator('.heure-clock__hand--hour');
  const minute = clock.locator('.heure-clock__hand--minute');
  const faceColor = await style(face, 'fill');
  expect(contrast(faceColor, await style(number, 'fill'))).toBeGreaterThanOrEqual(4.5);
  expect(contrast(faceColor, await style(hour, 'stroke'))).toBeGreaterThanOrEqual(4.5);
  expect(contrast(faceColor, await style(minute, 'stroke'))).toBeGreaterThanOrEqual(3);

  const parent = page.getByRole('region', { name: 'Pour le parent' });
  await parent.getByRole('button', { name: 'Un indice' }).click();
  await expect(parent).toContainText('La petite aiguille montre les heures');
  await parent.getByRole('button', { name: 'Voir la réponse' }).click();
  await expect(parent).toContainText(/\d{1,2}:\d{2}/);
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
});

test('le petit marché : un prix, le porte-monnaie, des pièces à montrer', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Le petit marché' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('button', { name: /La partie/ }).click();
  await page.getByText('En montrant', { exact: true }).click();
  await page.getByText('Grands', { exact: true }).click();
  await expect(page.getByText(/parmi 4 choix/)).toBeVisible();
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('link', { name: /Le petit marché/ }).click();

  await expect(page.getByRole('region', { name: 'Question' })).toContainText(
    'Quelles pièces donnes-tu ?',
  );
  await expect(page.getByRole('region', { name: 'Article' })).toContainText('€');
  const purse = page.getByRole('region', { name: 'Porte-monnaie' }).getByRole('img');
  await expect(purse).toBeVisible();
  await inScreen(page, purse);

  const board = page.getByRole('region', { name: 'Choix de l’enfant' });
  const options = board.getByRole('button');
  await expect(options).toHaveCount(4);
  // Les pièces de chaque choix sont dessinées et s'affichent.
  await expect(options.first().locator('img')).toBeVisible();
  await inScreen(page, board);

  const parent = page.getByRole('region', { name: 'Pour le parent' });
  await parent.getByRole('button', { name: 'Voir la réponse' }).click();
  await expect(parent).toContainText('Par exemple');
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
});
