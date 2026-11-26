import { expect, test } from '@playwright/test';

// #49 : repasser une majuscule ou un chiffre au doigt dans Quelle lettre ?

test('le modèle reste visible sous le trait, les consignes au-dessus du dessin', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('./');
  await page.getByRole('link', { name: /Quelle lettre/ }).click();
  await page.getByRole('button', { name: 'Tracer au doigt' }).click();

  const model = page.getByRole('img', { name: /^Lettre [A-Z] en pointillés/ });
  await expect(model).toBeVisible();
  const canvas = page.getByLabel('Zone de dessin');
  const area = (await canvas.boundingBox())!;

  // Consigne et boutons au-dessus du dessin : la main, droite ou gauche, ne les cache pas.
  for (const el of [
    page.getByText(/Pars du point/),
    page.getByRole('button', { name: 'Voir le tracé' }),
    page.getByRole('button', { name: 'Tout effacer' }),
  ]) {
    const box = (await el.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(area.y);
  }

  await page.getByRole('button', { name: 'Voir le tracé' }).click();
  await expect(page.getByTestId('trace-demo')).toBeAttached();

  // L'enfant trace en travers de la zone : le modèle est toujours là, par-dessus.
  await page.mouse.move(area.x + 20, area.y + 20);
  await page.mouse.down();
  await page.mouse.move(area.x + area.width - 20, area.y + area.height - 20, { steps: 10 });
  await page.mouse.up();
  await expect(model).toBeVisible();
  await expect(page.getByTestId('trace-demo')).not.toBeAttached();
  await expect(page.getByRole('button', { name: 'Annuler le dernier trait' })).toBeEnabled();
  // Le modèle laisse passer le doigt jusqu'au dessin.
  const center = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
  expect(
    await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.tagName.toLowerCase(),
      center,
    ),
  ).toBe('canvas');

  await page.getByRole('button', { name: 'C’est tracé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  await expect(page.getByLabel('1 étoile')).toBeVisible();
});
