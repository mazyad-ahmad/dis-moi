import type { Level } from './levels';
import { drawForTurns, nextForLevel, playsInTurns, rotation, startOrder, turnAt } from './turns';

/** Générateur pseudo-aléatoire reproductible. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

function count<T>(list: T[]) {
  const out = new Map<T, number>();
  list.forEach((x) => out.set(x, (out.get(x) ?? 0) + 1));
  return out;
}

describe('rotation', () => {
  it('3 joueurs et 10 manches : 4-3-3, le premier tiré au sort joue une manche de plus', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const order = startOrder(['Léa', 'Sami', 'Noé'], seeded(seed));
      const turns = rotation(order, 10);
      expect(turns).toHaveLength(10);
      const counts = count(turns);
      expect([...counts.values()].sort().reverse()).toEqual([4, 3, 3]);
      expect(counts.get(order[0])).toBe(4);
    }
  });

  it('chacun son tour, dans l’ordre de départ, puis on recommence', () => {
    expect(rotation(['a', 'b', 'c'], 7)).toEqual(['a', 'b', 'c', 'a', 'b', 'c', 'a']);
    expect(turnAt(['a', 'b'], 1)).toBe('a');
    expect(turnAt(['a', 'b'], 4)).toBe('b');
    expect(rotation([], 5)).toEqual([]);
  });

  it('l’ordre de départ est tiré au sort, sans perdre personne', () => {
    const firsts = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const order = startOrder(['a', 'b', 'c'], seeded(seed));
      expect([...order].sort()).toEqual(['a', 'b', 'c']);
      firsts.add(order[0]);
    }
    expect(firsts.size).toBe(3);
  });

  it('un seul joueur : on joue en équipe', () => {
    expect(playsInTurns('turns', 1)).toBe(false);
    expect(playsInTurns('turns', 0)).toBe(false);
    expect(playsInTurns('turns', 2)).toBe(true);
    expect(playsInTurns('team', 3)).toBe(false);
  });
});

describe('cartes au niveau de l’enfant du tour', () => {
  const cards = [
    { id: 'p1', level: 1 as Level },
    { id: 'p2', level: 1 as Level },
    { id: 'm1', level: 2 as Level },
    { id: 'g1', level: 3 as Level },
    { id: 'g2', level: 3 as Level },
  ];
  const levelOf = (c: { level: Level }) => c.level;

  it('une carte par manche, au niveau de chaque enfant, sans répétition', () => {
    const drawn = drawForTurns(cards, [1, 3, 1, 3], levelOf, seeded(3));
    expect(drawn.map((c) => c.level)).toEqual([1, 3, 1, 3]);
    expect(new Set(drawn).size).toBe(4);
  });

  it('niveau épuisé : repli sur le niveau voisin ; sans niveau, toutes les cartes', () => {
    const drawn = drawForTurns(cards, [1, 1, 1, null, null], levelOf, seeded(5));
    expect(drawn.slice(0, 3).map((c) => c.level)).toEqual([1, 1, 2]);
    expect(new Set(drawn).size).toBe(5);
  });

  it('plus de manches que de cartes : on repart de toutes, jamais deux fois de suite', () => {
    const drawn = drawForTurns(cards.slice(0, 2), [1, 1, 1, 1, 1], levelOf, seeded(7));
    expect(drawn).toHaveLength(5);
    drawn.forEach((c, i) => i > 0 && expect(c).not.toBe(drawn[i - 1]));
  });

  it('prochaine carte : pas une carte déjà montrée tant qu’il en reste', () => {
    expect(nextForLevel(cards, 3, levelOf, [cards[3]], seeded(1))).toBe(cards[4]);
    expect(nextForLevel([], 1, levelOf, [])).toBeUndefined();
  });
});
