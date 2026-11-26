import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { findCatalogueGame } from '../catalogue/catalogue';
import { DAILY_SOURCES } from '../defi/daily';
import { suitsMode } from '../modes';
import { revealsInCatalogue } from '../reveal/reveal';
import {
  amount,
  CELL,
  COMPTE_ID,
  EMOJI_SIZE,
  JITTER,
  layout,
  makeCard,
  MAX_COUNT,
  nearNumbers,
  plural,
  seeded,
  singular,
  type CountCard,
} from './compte';

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const game = findCatalogueGame(COMPTE_ID)!;
const atLevel = (level: number) => game.items.filter((i) => i.level === level);

/** Beaucoup de cartes d'un niveau, tirées d'une graine fixe. */
function cards(level: number, n = 400): CountCard[] {
  const random = seeded(`niveau-${level}`);
  const objects = atLevel(level);
  return Array.from({ length: n }, (_, i) => makeCard(objects[i % objects.length], random));
}

describe('objets à compter', () => {
  it('assez d’objets par niveau, des emoji différents, un pluriel régulier', () => {
    for (const level of [1, 2, 3]) expect(atLevel(level).length).toBeGreaterThanOrEqual(12);
    expect(new Set(game.items.map((i) => i.emoji)).size).toBe(game.items.length);
    for (const item of game.items) {
      expect(item.answer).toMatch(/^Les \S+[sx]$/);
      expect(singular(item) + plural(item).slice(-1)).toBe(plural(item));
    }
    const pomme = game.items.find((i) => i.id === 'pomme')!;
    expect(amount(1, pomme)).toBe('1 pomme');
    expect(amount(3, pomme)).toBe('3 pommes');
  });

  it('se regarde : au coucher, pas en voiture ; dans le défi, pas en image cachée', () => {
    expect(game.needs).toEqual({ looks: true, moves: false });
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
    expect(suitsMode(game.needs, 'voiture')).toBe(false);
    expect(game.activities[0]).toBe('lire-compter');
    expect(DAILY_SOURCES.some((s) => s.game === COMPTE_ID)).toBe(true);
    expect(revealsInCatalogue(game)).toBe(false);
  });
});

describe('cartes générées', () => {
  it('jusqu’à 5 pour les petits, 10 pour les moyens, 20 et des opérations pour les grands', () => {
    for (const level of [1, 2, 3] as const) {
      const all = cards(level);
      const kinds = new Set(all.map((c) => c.kind));
      for (const card of all) {
        expect(card.level).toBe(level);
        for (const g of card.groups) {
          expect(g.count).toBeGreaterThanOrEqual(1);
          expect(g.count).toBeLessThanOrEqual(MAX_COUNT[level]);
          expect(g.field.spots).toHaveLength(g.count);
        }
        if (card.kind !== 'compare') expect(Number(card.answer)).toBeLessThanOrEqual(20);
      }
      expect(kinds.has('count')).toBe(true);
      expect(kinds.has('compare')).toBe(true);
      expect(kinds.has('add') || kinds.has('sub')).toBe(level === 3);
      if (level === 3) {
        expect(kinds).toEqual(new Set(['count', 'compare', 'add', 'sub']));
        expect(Math.max(...all.map((c) => c.groups[0].count))).toBe(20);
      }
    }
  });

  it('chaque réponse est juste', () => {
    for (const card of [1, 2, 3].flatMap((l) => cards(l))) {
      const [a, b] = card.groups;
      if (card.kind === 'count') expect(card.answer).toBe(String(a.count));
      if (card.kind === 'add') {
        expect(a.object).toBe(b.object);
        expect(card.answer).toBe(String(a.count + b.count));
        expect(card.question).toBe(
          `${amount(a.count, a.object)} et ${amount(b.count, b.object)}, ça fait combien ?`,
        );
      }
      if (card.kind === 'sub') {
        const gone = a.field.crossed.length;
        expect(gone).toBeGreaterThanOrEqual(1);
        expect(card.answer).toBe(String(a.count - gone));
      }
      if (card.kind === 'compare') {
        expect(a.object.emoji).not.toBe(b.object.emoji);
        expect(a.count).not.toBe(b.count);
        expect(card.answer).toBe((a.count > b.count ? a : b).object.answer);
        expect(card.question).toBe('Où y en a-t-il le plus ?');
      }
    }
  });

  it('les objets ne se chevauchent pas et restent dans leur champ', () => {
    // Un emoji fait au plus 1,2 fois sa taille : il ne sort jamais de sa case.
    expect(EMOJI_SIZE * 0.6 + JITTER).toBeLessThan(CELL / 2);
    for (const count of Array.from({ length: 20 }, (_, i) => i + 1))
      for (const r of [0.1, 0.7]) {
        const field = layout(count, seeded(`${count}-${r}`));
        const width = field.cols * CELL;
        const height = field.rows * CELL;
        for (const [i, s] of field.spots.entries()) {
          expect(s.x - EMOJI_SIZE * 0.6).toBeGreaterThanOrEqual(0);
          expect(s.x + EMOJI_SIZE * 0.6).toBeLessThanOrEqual(width);
          expect(s.y - EMOJI_SIZE * 0.6).toBeGreaterThanOrEqual(0);
          expect(s.y + EMOJI_SIZE * 0.6).toBeLessThanOrEqual(height);
          for (const t of field.spots.slice(i + 1)) {
            const apart = Math.max(Math.abs(s.x - t.x), Math.abs(s.y - t.y));
            expect(apart).toBeGreaterThanOrEqual(EMOJI_SIZE * 1.2);
          }
        }
        // Lisible sur un petit écran : au plus 6 cases de large.
        expect(field.cols).toBeLessThanOrEqual(6);
      }
  });

  it('en constellation, les faces d’un dé ; sinon au hasard', () => {
    const dice = layout(5, () => 0);
    expect(dice.dice).toBe(true);
    expect(dice.spots).toHaveLength(5);
    expect(layout(5, () => 0.9).dice).toBe(false);
    expect(layout(12, () => 0).dice).toBe(false);
  });

  it('jamais deux parties identiques, mais le même défi toute la journée', () => {
    const item = atLevel(2)[0];
    const play = () => JSON.stringify(Array.from({ length: 10 }, () => makeCard(item)));
    expect(play()).not.toBe(play());
    expect(JSON.stringify(makeCard(item, seeded('2026-11-26')))).toBe(
      JSON.stringify(makeCard(item, seeded('2026-11-26'))),
    );
  });

  it('propose des nombres proches de la réponse, jamais négatifs', () => {
    const near = nearNumbers(1, () => 0.5);
    expect(near).not.toContain(1);
    expect(near.every((n) => n >= 0)).toBe(true);
    expect(Math.abs(near[0] - 1)).toBe(1);
  });
});

describe('Compte avec moi', () => {
  it('le parent lit la question, voit la réponse et valide', async () => {
    await setSetting('gameLevel', 1);
    const user = userEvent.setup();
    open(`/jeu/${COMPTE_ID}`);
    expect(screen.getByRole('heading', { name: 'Compte avec moi' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Question' })).toHaveTextContent(
      /^Le parent lit à voix haute(Combien d(e |’)\S+ \?|Où y en a-t-il le plus \?)/,
    );
    const objects = screen.getByRole('region', { name: 'Objets' });
    expect(within(objects).getAllByRole('img').length).toBeGreaterThanOrEqual(1);
    // À voix haute : pas de choix à toucher.
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();

    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    await user.click(within(parent).getByRole('button', { name: 'Voir la réponse' }));
    expect(parent).toHaveTextContent(/\d/);
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pas encore' }));
    expect(screen.getByText('Manche 3 sur 10')).toBeInTheDocument();
  });

  it('en montrant, l’enfant touche la bonne réponse parmi les choix', async () => {
    await setSetting('gameLevel', 3);
    await setSetting('showChoices', true);
    const user = userEvent.setup();
    open(`/jeu/${COMPTE_ID}`);
    const board = screen.getByRole('region', { name: 'Choix de l’enfant' });
    const options = within(board).getAllByRole('button');
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options.length).toBeLessThanOrEqual(4);
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

  it('se joue dans le Grand Jeu avec ses objets', async () => {
    await setSetting('catalogue', ['mime', COMPTE_ID]);
    await setSetting('grandExcluded', ['chanson', 'lettres', 'dessin', 'raconte']);
    const user = userEvent.setup();
    open('/jeu/grand-jeu');
    let seen = false;
    for (const round of [1, 2]) {
      await user.click(await screen.findByRole('button', { name: /C’est parti/ }));
      const objects = screen.queryByRole('region', { name: 'Objets' });
      if (objects) {
        seen = true;
        expect(within(objects).getAllByRole('img').length).toBeGreaterThanOrEqual(1);
      }
      await user.click(screen.getByRole('button', { name: objects ? 'Pas encore' : 'Passer' }));
      if (round === 1) await screen.findByText('Manche 2 sur 10');
    }
    expect(seen).toBe(true);
  });
});
