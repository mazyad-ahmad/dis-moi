import { expect, test } from '@playwright/test';

// #118 : vrais cris et photos dans « Quel animal ? », hors ligne après installation.
test('Quel animal : vrai cri et photo, hors ligne', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);

  await page.goto('./#/jeu/animal');
  // L'imitation reste la façon de jouer ; le vrai cri vient en plus.
  await expect(page.getByText(/À imiter/)).toBeVisible();
  const listen = page.getByRole('button', { name: 'Écouter le cri' });
  await expect(listen).toBeEnabled();
  await listen.click();
  await expect(page.getByText('Le cri ne s’est pas lancé', { exact: false })).toBeHidden();

  // Pas de photo avant la réponse.
  const photo = page.getByRole('img', { name: /^Photo/ });
  await expect(photo).toHaveCount(0);
  await page.getByRole('button', { name: 'Voir la réponse' }).click();
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBeGreaterThan(0);

  // « Trouvé » : manche suivante, photo de l'animal trouvé par-dessus, un appui la ferme.
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText(/Manche 2/)).toBeVisible();
  const overlay = page.getByRole('button', { name: /Toucher pour fermer la photo/ });
  await expect(overlay).toBeVisible();
  await overlay.click();
  await expect(overlay).toBeHidden();
  await expect(photo).toHaveCount(0);
});
