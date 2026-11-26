import { expect, test } from '@playwright/test';
import { storedSetting } from './storage';

test('qui joue aujourd’hui : seuls les joueurs actifs sont dans la partie', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Ajouter', exact: true }).click();
  for (const name of ['Léa', 'Sami']) {
    await page.getByPlaceholder('Prénom').fill(name);
    await page.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByLabel(`Prénom de ${name}`)).toBeVisible();
  }
  await page.getByRole('link', { name: 'Retour' }).click();

  await page.getByRole('button', { name: /La partie/ }).click();
  const group = page.getByRole('group', { name: 'Qui joue ?' });
  const sami = group.getByRole('button', { name: 'Sami' });
  await expect(sami).toHaveAttribute('aria-pressed', 'true');

  // Au clavier : focus sur la pastille, puis Entrée.
  await sami.focus();
  await page.keyboard.press('Enter');
  await expect(sami).toHaveAttribute('aria-pressed', 'false');

  // Attendre que le réglage soit écrit dans IndexedDB avant de recharger.
  await expect
    .poll(
      async () => ((await storedSetting(page, 'absentPlayers')) as unknown[] | undefined)?.length,
    )
    .toBe(1);

  // Le choix est gardé après un rechargement.
  await page.reload();
  await page.getByRole('button', { name: /La partie/ }).click();
  await expect(group.getByRole('button', { name: 'Sami' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(group.getByRole('button', { name: 'Léa' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Fermer' }).click();

  await page.getByRole('link', { name: /Quelle lettre/ }).click();
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await page.getByRole('link', { name: 'Quitter la partie' }).click();

  await page.getByRole('link', { name: 'Étoiles', exact: true }).click();
  const history = page.getByRole('region', { name: 'Dernières parties' });
  await expect(history.getByText(/aujourd’hui · Léa ·/)).toBeVisible();
  await expect(history.getByText(/Sami/)).toHaveCount(0);
});
