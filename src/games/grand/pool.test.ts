import type { CustomGame } from '../../data/db';
import { CATALOGUE } from '../catalogue/catalogue';
import { GAMES } from '../registry';
import {
  announce,
  grandGames,
  includedGames,
  planRounds,
  resolvePlan,
  type GrandGame,
  type PlannedRound,
} from './pool';

/** Générateur pseudo-aléatoire reproductible. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const custom = (id: number, items: CustomGame['items'], kind: CustomGame['kind'] = 'question') =>
  ({ id, name: `Jeu ${id}`, kind, items, createdAt: id, updatedAt: id }) as CustomGame;

const home = [...GAMES, CATALOGUE[2]];

function noRepeat(plan: PlannedRound[]) {
  return plan.every((r, i) => i === 0 || r.game !== plan[i - 1].game);
}

describe('jeux du Grand Jeu', () => {
  it('prend les jeux de base, du catalogue et créés, sauf ceux sans carte', () => {
    const games = grandGames(
      [
        ...home,
        { id: 'perso-1', name: 'Vide', category: 'Question', tint: 'sky' },
        {
          id: 'perso-2',
          name: 'Quiz',
          category: 'Question',
          tint: 'sky',
        },
      ],
      [custom(1, []), custom(2, [{ answer: 'Paris', text: 'Capitale ?' }])],
    );
    expect(games.map((g) => g.id)).toEqual(['chanson', 'lettres', 'dessin', 'mime', 'perso-2']);
    expect(games.find((g) => g.id === 'lettres')!.cards.length).toBe(36);
    expect(games.find((g) => g.id === 'perso-2')!.cards[0]).toMatchObject({
      type: 'deck',
      kind: 'question',
      key: '0:Paris',
    });
  });

  it('joue un jeu créé « Mot à dessiner » comme un dessin', () => {
    const [game] = grandGames(
      [{ id: 'perso-3', name: 'Mots', category: 'Dessin', tint: 'dawn' }],
      [custom(3, [{ answer: 'Lune' }, { answer: 'Lune' }, { answer: 'Chat' }], 'draw')],
    );
    expect(game.cards).toEqual([
      { key: 'Lune', type: 'draw', word: 'Lune' },
      { key: 'Chat', type: 'draw', word: 'Chat' },
    ]);
  });

  it('garde au moins deux jeux inclus', () => {
    const games = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(includedGames(games, ['b'])).toEqual([{ id: 'a' }, { id: 'c' }]);
    expect(includedGames(games, ['a', 'b'])).toEqual(games);
  });
});

describe('manches du Grand Jeu', () => {
  const games = grandGames(home, []);

  it('jamais deux manches de suite dans le même jeu', () => {
    for (let seed = 1; seed < 200; seed++) {
      const plan = planRounds(games, 15, seeded(seed));
      expect(plan).toHaveLength(15);
      expect(noRepeat(plan)).toBe(true);
      // Chaque jeu revient régulièrement.
      for (const g of games) expect(plan.filter((r) => r.game === g.id).length).toBeGreaterThan(2);
    }
  });

  it('alterne aussi avec deux jeux', () => {
    for (let seed = 1; seed < 50; seed++)
      expect(noRepeat(planRounds(games.slice(1, 3), 10, seeded(seed)))).toBe(true);
  });

  it('ne répète pas une carte tant que le jeu en a d’autres', () => {
    const plan = planRounds(games, 15, seeded(7));
    for (const g of games) {
      const cards = plan.filter((r) => r.game === g.id).map((r) => r.card);
      expect(new Set(cards).size).toBe(cards.length);
    }
  });

  it('reprend les manches prévues, ou rien si un jeu a disparu', () => {
    const plan = planRounds(games, 10, seeded(3));
    const rounds = resolvePlan(plan, games)!;
    expect(rounds.map((r) => [r.game.id, r.card.key])).toEqual(plan.map((r) => [r.game, r.card]));
    const others: GrandGame[] = games.filter((g) => g.id !== plan[0].game);
    expect(resolvePlan(plan, others)).toBeUndefined();
    expect(resolvePlan([{ game: 'chanson', card: 'inconnue' }], games)).toBeUndefined();
    expect(resolvePlan('n’importe quoi', games)).toBeUndefined();
    expect(resolvePlan([], games)).toBeUndefined();
  });
});

it('annonce le jeu de la manche', () => {
  expect(announce('Mime ça')).toBe('Maintenant : Mime ça !');
  expect(announce('Quelle chanson ?')).toBe('Maintenant : Quelle chanson ?');
});
