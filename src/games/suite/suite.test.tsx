import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { findCatalogueGame } from '../catalogue/catalogue';
import { seeded } from '../compte/compte';
import { DAILY_SOURCES } from '../defi/daily';
import { suitsMode } from '../modes';
import { revealsInCatalogue } from '../reveal/reveal';
import {
  cellKey,
  cellName,
  familyOf,
  makeSuite,
  MAX_COUNT,
  MOTIFS,
  plural,
  SUITE_ID,
  suiteChoices,
  type SuiteCard,
} from './suite';

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const game = findCatalogueGame(SUITE_ID)!;
const atLevel = (level: number) => game.items.filter((i) => i.level === level);

/** Beaucoup de suites d'un niveau, tirées d'une graine fixe. */
function suites(level: number, n = 300): SuiteCard[] {
  const random = seeded(`suite-${level}`);
  const items = atLevel(level);
  return Array.from({ length: n }, (_, i) => makeSuite(items[i % items.length], random));
}

/**
 * Formes colorées du pack et leur forme : chaque couleur vient avec une forme à elle, pour
 * qu'un enfant daltonien distingue toujours les cases.
 */
const SHAPES: Record<string, string> = {
  '🔴': 'rond',
  '🟦': 'carré',
  '⭐': 'étoile',
  '💚': 'cœur',
  '🔺': 'triangle',
  '🔷': 'losange',
};
const COLOR_ONLY = /[🟠🟡🟢🔵🟣🟤⚫⚪🟥🟧🟨🟩🟪🟫]/u;

describe('images de la suite', () => {
  it('assez d’images par niveau, en familles, avec un pluriel régulier', () => {
    for (const level of [1, 2, 3]) expect(atLevel(level).length).toBeGreaterThanOrEqual(10);
    expect(new Set(game.items.map((i) => i.emoji)).size).toBe(game.items.length);
    const families = new Map<string, number>();
    for (const item of game.items) {
      expect(item.answer).toMatch(/^(un|une) \S+( \S+)?$/);
      expect(item.tags).toHaveLength(1);
      families.set(familyOf(item), (families.get(familyOf(item)) ?? 0) + 1);
      // Pas de nom au pluriel irrégulier (-al, -au, -eu).
      expect(item.answer.split(' ')[1]).not.toMatch(/(al|au|eu)$/);
    }
    for (const n of families.values()) expect(n).toBeGreaterThanOrEqual(4);
    const pomme = game.items.find((i) => i.id === 'pomme')!;
    expect(cellName({ item: pomme, count: 1 })).toBe('une pomme');
    expect(cellName({ item: pomme, count: 4 })).toBe('4 pommes');
    expect(plural(game.items.find((i) => i.id === 'carre-bleu')!)).toBe('carrés bleus');
    expect(plural(game.items.find((i) => i.id === 'bus')!)).toBe('bus');
  });

  it('chaque couleur vient avec sa propre forme (lisible par un enfant daltonien)', () => {
    const formes = game.items.filter((i) => familyOf(i) === 'formes');
    for (const item of formes) {
      expect(SHAPES[item.emoji!]).toBeDefined();
      // Le nom dit la forme et la couleur.
      expect(item.answer.split(' ')[1]).toBe(SHAPES[item.emoji!]);
    }
    expect(new Set(formes.map((i) => SHAPES[i.emoji!])).size).toBe(formes.length);
    // Aucune pastille de couleur seule, sans forme distincte.
    for (const item of game.items) expect(item.emoji).not.toMatch(COLOR_ONLY);
  });

  it('se regarde : au coucher, pas en voiture ; dans le défi, pas en image cachée', () => {
    expect(game.needs).toEqual({ looks: true, moves: false });
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
    expect(suitsMode(game.needs, 'voiture')).toBe(false);
    expect(game.activities[0]).toBe('lire-compter');
    expect(DAILY_SOURCES.some((s) => s.game === SUITE_ID)).toBe(true);
    expect(revealsInCatalogue(game)).toBe(false);
  });
});

describe('suites générées', () => {
  it('petits AB, moyens ABC / AAB / ABB, grands des suites qui grandissent', () => {
    for (const level of [1, 2, 3] as const) {
      const all = suites(level);
      expect(new Set(all.map((c) => c.motif))).toEqual(new Set(MOTIFS[level]));
      for (const card of all) expect(card.level).toBe(level);
    }
  });

  it('montre au moins deux fois le motif complet avant la case vide', () => {
    for (const card of [...suites(1), ...suites(2)]) {
      const shown = card.cells.map((c) => cellKey(c)).join(',');
      const one = [...card.motif]
        .map((letter) => cellKey(card.cells[card.motif.indexOf(letter)]))
        .join(',');
      expect(shown.startsWith(`${one},${one}`)).toBe(true);
      // La case vide continue le motif.
      const next = card.cells.length % card.motif.length;
      expect(cellKey(card.answer)).toBe(cellKey(card.cells[next]));
      expect(card.cells.length).toBeLessThanOrEqual(8);
      // Les lettres différentes du motif sont des images différentes, de la même famille.
      const letters = new Set(card.motif).size;
      expect(new Set(card.cells.map((c) => c.item.emoji)).size).toBe(letters);
      expect(new Set(card.cells.map((c) => familyOf(c.item))).size).toBe(1);
    }
  });

  it('grands : une de plus à chaque case, la règle vue au moins deux fois', () => {
    for (const card of suites(3)) {
      const counts = card.cells.map((c) => c.count);
      expect(counts.length).toBeGreaterThanOrEqual(3);
      counts.forEach((n, i) => expect(n).toBe(i + 1));
      expect(card.answer.count).toBe(counts.length + 1);
      expect(card.answer.count).toBeLessThanOrEqual(MAX_COUNT);
      if (card.motif === 'grow2') {
        // Deux règles : les images alternent, deux fois chacune.
        const [a, b] = card.cells.map((c) => c.item);
        expect(a).not.toBe(b);
        expect(card.cells.map((c) => c.item)).toEqual([a, b, a, b]);
        expect(card.answer.item).toBe(a);
      } else expect(new Set(card.cells.map((c) => c.item)).size).toBe(1);
    }
  });

  it('jamais à court : deux parties diffèrent, le même défi toute la journée', () => {
    const item = atLevel(2)[0];
    const play = () => JSON.stringify(Array.from({ length: 10 }, () => makeSuite(item)));
    expect(play()).not.toBe(play());
    expect(JSON.stringify(makeSuite(item, seeded('2026-11-26')))).toBe(
      JSON.stringify(makeSuite(item, seeded('2026-11-26'))),
    );
  });

  it('choix à montrer : la réponse une fois, sans doublon, autant que demandé', () => {
    for (const level of [1, 2, 3])
      for (const card of suites(level, 60))
        for (const count of [2, 3, 4]) {
          const options = suiteChoices(card, count, seeded(`${level}-${count}`));
          expect(options).toHaveLength(count);
          const keys = options.map(cellKey);
          expect(new Set(keys).size).toBe(count);
          expect(keys.filter((k) => k === cellKey(card.answer))).toHaveLength(1);
          for (const o of options) {
            expect(o.count).toBeGreaterThanOrEqual(1);
            expect(o.count).toBeLessThanOrEqual(MAX_COUNT);
          }
        }
  });
});

describe('La suite logique', () => {
  it('le parent lit la question, voit la réponse et valide', async () => {
    await setSetting('gameLevel', 1);
    const user = userEvent.setup();
    open(`/jeu/${SUITE_ID}`);
    expect(screen.getByRole('heading', { name: 'La suite logique' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Question' })).toHaveTextContent(
      'Qu’est-ce qui vient ensuite ?',
    );
    const suite = screen.getByRole('region', { name: 'Suite' });
    const cells = within(suite).getAllByRole('img');
    expect(cells.length).toBeGreaterThanOrEqual(5);
    expect(cells.at(-1)).toHaveAccessibleName('Case vide');
    // À voix haute : pas de choix à toucher.
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();

    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    await user.click(within(parent).getByRole('button', { name: 'Voir la réponse' }));
    expect(parent).toHaveTextContent(/se répète/);
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
  });

  it('en montrant, l’enfant touche ce qui vient ensuite parmi les choix', async () => {
    await setSetting('gameLevel', 2);
    await setSetting('showChoices', true);
    const user = userEvent.setup();
    open(`/jeu/${SUITE_ID}`);
    const board = screen.getByRole('region', { name: 'Choix de l’enfant' });
    const options = within(board).getAllByRole('button');
    expect(options).toHaveLength(3);
    // Un mauvais choix ne fait rien ; un seul choix est le bon.
    const status = within(board).getByRole('status');
    let right = 0;
    for (const option of options) {
      await user.click(option);
      if (status.textContent?.includes('Oui, c’est ça')) right++;
      if (right) break;
      expect(status).toHaveTextContent('');
    }
    expect(right).toBe(1);
    expect(screen.getByText('Manche 1 sur 10')).toBeInTheDocument();
  });

  it('se joue dans le Grand Jeu avec sa suite', async () => {
    await setSetting('catalogue', ['mime', SUITE_ID]);
    await setSetting('grandExcluded', ['chanson', 'lettres', 'dessin', 'raconte']);
    const user = userEvent.setup();
    open('/jeu/grand-jeu');
    let seen = false;
    for (const round of [1, 2]) {
      await user.click(await screen.findByRole('button', { name: /C’est parti/ }));
      const suite = screen.queryByRole('region', { name: 'Suite' });
      if (suite) {
        seen = true;
        expect(within(suite).getByRole('img', { name: 'Case vide' })).toBeInTheDocument();
      }
      await user.click(screen.getByRole('button', { name: suite ? 'Pas encore' : 'Passer' }));
      if (round === 1) await screen.findByText('Manche 2 sur 10');
    }
    expect(seen).toBe(true);
  });
});
