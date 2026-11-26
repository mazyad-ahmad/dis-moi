import { expect, test } from '@playwright/test';

// #131 : Remets dans l'ordre. Les images se déplacent au doigt et au clavier ; le parent valide.
test('remets dans l’ordre : déplacer les images au doigt et au clavier', async ({ page }) => {
  await page.goto('./#/ajouter');
  await page.getByRole('button', { name: 'Ajouter Remets dans l’ordre' }).click();
  await page.getByRole('link', { name: 'Retour' }).click();
  await page.getByRole('link', { name: /Remets dans l’ordre/ }).click();

  const board = page.getByRole('region', { name: 'Images à remettre dans l’ordre' });
  const tiles = board.getByRole('button', { name: /, place \d sur \d$/ });
  const names = async () =>
    (await tiles.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')!))).map((n) =>
      n.replace(/, place \d sur \d$/, ''),
    );
  expect(await tiles.count()).toBeGreaterThanOrEqual(3);

  // Au doigt : toucher la dernière image, puis la première place.
  const before = await names();
  const lastName = before.at(-1)!;
  await tiles.last().tap();
  await expect(tiles.last()).toHaveAttribute('aria-pressed', 'true');
  await tiles.first().tap();
  expect((await names())[0]).toBe(lastName);

  // Au clavier : flèche bas sur l'image, qui garde le focus.
  await tiles.first().focus();
  await page.keyboard.press('ArrowDown');
  expect((await names())[1]).toBe(lastName);
  await expect(
    board.getByRole('button', { name: new RegExp(`^${lastName}, place 2`) }),
  ).toBeFocused();

  // L'ordre attendu est dans le bloc du parent, qui peut le montrer.
  const parent = page.getByRole('region', { name: 'Pour le parent' });
  await parent.getByRole('button', { name: 'Voir la réponse' }).click();
  await parent.getByRole('button', { name: 'Montrer le bon ordre' }).click();
  await expect(board.getByRole('status')).toHaveText('Voilà le bon ordre !');
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
});
