// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PLAYER_COLORS } from '../data/db';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

/** Variables d'un bloc CSS commençant par `selector {`. */
function block(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
  );
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const css = read('src/components/avatar.css');
const tokens = read('src/styles/tokens.css');
const themes = {
  jour: { avatar: block(css, ':root'), page: block(tokens, ':root') },
  nuit: {
    avatar: block(css, ":root[data-theme='night']"),
    page: block(tokens, ":root[data-theme='night']"),
  },
};

describe.each(Object.entries(themes))('couleurs des avatars, thème %s', (_, { avatar, page }) => {
  it.each(PLAYER_COLORS)('%s : cercle lisible (3:1) sur le papier et la brume', (color) => {
    const ring = avatar[`--avatar-${color}-ring`];
    expect(ring).toBeDefined();
    expect(avatar[`--avatar-${color}`]).toBeDefined();
    expect(contrast(ring, page['--paper'])).toBeGreaterThanOrEqual(3);
    expect(contrast(ring, page['--mist'])).toBeGreaterThanOrEqual(3);
  });

  it('a six couleurs différentes', () => {
    const rings = PLAYER_COLORS.map((c) => avatar[`--avatar-${c}-ring`]);
    expect(new Set(rings).size).toBe(PLAYER_COLORS.length);
  });
});

it('le thème sombre du téléphone reprend les couleurs de nuit', () => {
  expect(block(css, "  :root:not([data-theme='light'])")).toEqual(themes.nuit.avatar);
});
