// Génère src/styles/tokens.css à partir des tokens Cadmus de la maquette.
// Usage : npm run tokens
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const SOURCE = fileURLToPath(new URL('docs/maquette/ds/cadmus/tokens.json', root));
const TARGET = fileURLToPath(new URL('src/styles/tokens.css', root));

export function buildCss(tokens) {
  const light = [];
  const night = [];
  for (const { name, value } of tokens.color.tokens) {
    light.push(`--${name}: ${value.light};`);
    night.push(`--${name}: ${value.night};`);
  }
  for (const { name, value } of tokens.shadow.tokens) {
    light.push(`--${name}: ${value.light};`);
    night.push(`--${name}: ${value.night};`);
  }
  const common = [];
  for (const { name, value } of [...tokens.spacing.tokens, ...tokens.radius.tokens]) {
    common.push(`--${name}: ${value};`);
  }
  for (const [family, stack] of Object.entries(tokens.type.families)) {
    common.push(`--font-${family}: ${stack};`);
  }
  for (const group of tokens.type.groups) {
    for (const s of group.styles) {
      common.push(
        `--text-${s.name}: ${s.fontWeight} ${s.fontSize}/${s.lineHeight} var(--font-${group.family});`,
      );
      common.push(`--tracking-${s.name}: ${s.letterSpacing ?? 'normal'};`);
    }
  }
  const block = (sel, lines) => `${sel} {\n${lines.map((l) => `  ${l}`).join('\n')}\n}\n`;
  return [
    `/* Fichier généré par scripts/gen-tokens.mjs depuis ${tokens.name} v${tokens.version}. Ne pas modifier à la main. */\n`,
    block(':root', [...common, 'color-scheme: light;', ...light]),
    block(":root[data-theme='night']", ['color-scheme: dark;', ...night]),
    `@media (prefers-color-scheme: dark) {\n${block(":root:not([data-theme='light'])", ['color-scheme: dark;', ...night])}}\n`,
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tokens = JSON.parse(readFileSync(SOURCE, 'utf8'));
  writeFileSync(TARGET, buildCss(tokens));
  console.log(`tokens.css généré (${tokens.color.tokens.length} couleurs)`);
}
