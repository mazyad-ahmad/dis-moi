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
  });
}
