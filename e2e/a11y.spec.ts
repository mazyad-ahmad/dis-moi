import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Écrans audités (WCAG 2.1 A et AA), en thème jour puis nuit. */
const SCREENS = [
  ['accueil', '/'],
  ['étoiles', '/etoiles'],
  ['espace Parent', '/parent'],
  ['joueurs', '/joueurs'],
  ['ajouter un jeu', '/ajouter'],
  ['confidentialité', '/confidentialite'],
  ['Quelle chanson ?', '/jeu/chanson'],
  ['Quelle lettre ?', '/jeu/lettres'],
  ['Dessine ça', '/jeu/dessin'],
  ['Devinettes', '/jeu/devinette'],
] as const;

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accessibilité, thème ${colorScheme === 'light' ? 'jour' : 'nuit'}`, () => {
    for (const [name, path] of SCREENS) {
      test(name, async ({ page }) => {
        // Thème « Auto » (par défaut) : il suit le réglage du téléphone.
        // Pas d'animation en cours pendant l'audit des contrastes.
        await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
        await page.goto(`./#${path}`);
        await expect(page.locator('main')).toBeVisible();

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        const summary = results.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target.join(' ')),
        }));
        expect(summary).toEqual([]);
      });
    }

    test('dialogue de confirmation', async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto('./#/parent');
      const opener = page.getByRole('button', { name: 'Effacer toutes les données' });
      await opener.click();
      const dialog = page.getByRole('alertdialog', { name: 'Tout effacer ?' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Annuler' })).toBeFocused();
      // Reste de la page inerte : le focus ne sort pas du dialogue.
      for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
        await page.keyboard.press(key);
        expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
      }

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);

      // Échap ferme sans rien effacer et rend le focus au bouton d'origine.
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(opener).toBeFocused();
      await expect(page.getByRole('status')).toHaveText('');
    });
  });
}
