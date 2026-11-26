import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Jeu créé abîmé (nom manquant) écrit directement dans la base : son écran plante au rendu. */
/** Retire le jeu abîmé : l'accueil relit la liste des jeux créés. */
async function removeGame(page: import('@playwright/test').Page, id: number) {
  return page.evaluate(
    (id) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('dis-moi');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('customGames', 'readwrite');
          tx.objectStore('customGames').delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    id,
  );
}

async function addBrokenGame(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('dis-moi');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('customGames', 'readwrite');
          const req = tx
            .objectStore('customGames')
            .add({ name: null, kind: 'text', items: [], createdAt: 1, updatedAt: 1 });
          req.onsuccess = () => resolve(req.result as number);
          req.onerror = () => reject(req.error);
        };
      }),
  );
}

test('une erreur au rendu affiche l’écran « Oups », sans requête réseau', async ({ page }) => {
  page.on('pageerror', () => undefined);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'On joue à quoi ?' })).toBeVisible();
  const id = await addBrokenGame(page);

  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(`./#/jeu/perso-${id}`);
  await expect(page.getByRole('heading', { name: 'Oups !' })).toBeVisible();
  expect(requests).toEqual([]);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);

  await page.getByText('Détail technique').click();
  await expect(page.getByText(/TypeError/)).toBeVisible();

  await removeGame(page, id);
  await page.getByRole('button', { name: 'Accueil' }).click();
  await expect(page.getByRole('heading', { name: 'On joue à quoi ?' })).toBeVisible();
});
