// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error script Node en JS
import { buildCss } from '../../scripts/gen-tokens.mjs';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

it('tokens.css est à jour avec la maquette (sinon : npm run tokens)', () => {
  const tokens = JSON.parse(read('docs/maquette/ds/cadmus/tokens.json'));
  expect(read('src/styles/tokens.css')).toBe(buildCss(tokens));
});
