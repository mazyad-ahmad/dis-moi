// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

/** Déclarations du premier bloc dont le sélecteur est exactement `selector`. */
function rule(css: string, selector: string): string {
  const blocks = css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g);
  for (const [, sel, body] of blocks) {
    if (
      sel
        .split(',')
        .map((s) => s.trim())
        .join(', ') === selector
    )
      return body;
  }
  throw new Error(`règle introuvable : ${selector}`);
}

// La mise en page ne se mesure pas dans jsdom : l'e2e « barre » la vérifie sur mobile.
// Ici, on garde les règles qui empêchent le body de défiler à la place de l'écran (#145).
describe('mise en page : seul l’écran défile, la barre du bas reste en bas', () => {
  const ui = read('src/components/ui.css');
  const global = read('src/styles/global.css');

  it('la page elle-même ne défile pas', () => {
    expect(rule(global, 'html, body')).toMatch(/overflow:\s*hidden/);
  });

  it('l’appli prend la hauteur visible et ne déborde pas', () => {
    const app = rule(ui, '.app');
    expect(app).toMatch(/height:\s*100dvh/);
    expect(app).toMatch(/overflow:\s*hidden/);
  });

  it('l’écran défile et contient ses éléments en position absolue', () => {
    const screen = rule(ui, '.screen');
    expect(screen).toMatch(/overflow-y:\s*auto/);
    expect(screen).toMatch(/position:\s*relative/);
  });
});
