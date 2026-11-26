import { PACK_FILES, type Pack } from '../content/packs';
import { SONGS } from './chanson/songs';
import { CATALOGUE } from './catalogue/catalogue';
import { DRAW_LEVELS, DRAW_WORDS } from './dessin/words';
import { DIGITS, LETTERS } from './lettres/bank';
import {
  cardLevel,
  drawForLevel,
  isLevel,
  LEVELS,
  levelForAge,
  orderByLevel,
  pickForLevel,
  type Level,
} from './levels';
import { DEFAULT_ROUNDS } from './useRounds';

interface Card {
  id: string;
  level?: Level;
}
const levelOf = (c: Card) => c.level;
const cards = (level: Level | undefined, n: number, prefix: string): Card[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, level }));

describe('niveaux par âge', () => {
  it('trois niveaux : Petits 3-4 ans, Moyens 5-6 ans, Grands 7 ans et plus', () => {
    expect(LEVELS.map((l) => `${l.value} ${l.name} ${l.ages}`)).toEqual([
      '1 Petits 3-4 ans',
      '2 Moyens 5-6 ans',
      '3 Grands 7 ans et plus',
    ]);
    expect([2, 3, 4, 5, 6, 7, 10].map(levelForAge)).toEqual([1, 1, 1, 2, 2, 3, 3]);
    expect([0, 1, 2, 3, 4, '2', null].map(isLevel)).toEqual([
      false,
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
  });

  it('sans niveau choisi, simple mélange de toutes les cartes', () => {
    const all = [...cards(1, 3, 'p'), ...cards(3, 3, 'g')];
    const out = orderByLevel(all, null, levelOf);
    expect(out).toHaveLength(6);
    expect(new Set(out)).toEqual(new Set(all));
  });

  it('met d’abord les cartes du niveau voulu, et celles sans niveau qui conviennent à tous', () => {
    const all = [...cards(1, 4, 'p'), ...cards(2, 4, 'm'), ...cards(undefined, 2, 'x')];
    const out = drawForLevel(all, 6, 2, levelOf);
    expect(out.map((c) => c.id[0]).sort()).toEqual(['m', 'm', 'm', 'm', 'x', 'x']);
  });

  it('ne manque jamais de cartes : repli sur le niveau voisin, le plus facile d’abord', () => {
    const all = [...cards(1, 3, 'p'), ...cards(2, 2, 'm'), ...cards(3, 3, 'g')];
    // Grands : 3 grands, puis les moyens, puis les petits.
    expect(drawForLevel(all, 8, 3, levelOf).map((c) => c.id[0])).toEqual('gggmmppp'.split(''));
    // Moyens : à égale distance, les petits avant les grands.
    expect(drawForLevel(all, 8, 2, levelOf).map((c) => c.id[0])).toEqual('mmpppggg'.split(''));
    // Petits sans assez de cartes : les moyens complètent.
    expect(drawForLevel(all, 4, 1, levelOf).map((c) => c.id[0])).toEqual('pppm'.split(''));
  });

  it('pickForLevel tire une carte du niveau parmi celles pas encore jouées', () => {
    const all = [...cards(1, 2, 'p'), ...cards(3, 2, 'g')];
    const used = new Set<Card>();
    const picks = [1, 2, 3, 4].map(() => {
      const card = pickForLevel(all, 3, levelOf, (c) => used.has(c))!;
      used.add(card);
      return card.id[0];
    });
    expect(picks).toEqual(['g', 'g', 'p', 'p']);
    // Toutes jouées : on repart de toutes les cartes.
    expect(pickForLevel(all, 3, levelOf, (c) => used.has(c))!.level).toBe(3);
    expect(pickForLevel([], 1, levelOf)).toBeUndefined();
  });

  it('cardLevel ignore un niveau inconnu', () => {
    expect(cardLevel({ level: 2 })).toBe(2);
    expect(cardLevel({})).toBeUndefined();
    expect(cardLevel({ level: 7 })).toBeUndefined();
  });
});

describe('contenu intégré', () => {
  const packs = Object.values(PACK_FILES) as Pack[];

  it.each(packs.map((p) => [p.id, p] as const))('%s : chaque carte a un niveau', (_, pack) => {
    for (const item of pack.items) expect(isLevel(item.level), `${pack.id}/${item.id}`).toBe(true);
  });

  it('les jeux gardent le niveau de chaque carte', () => {
    for (const c of [...SONGS, ...LETTERS, ...DIGITS]) expect(isLevel(c.level)).toBe(true);
    for (const w of DRAW_WORDS) expect(isLevel(DRAW_LEVELS.get(w))).toBe(true);
    for (const g of CATALOGUE) for (const i of g.items) expect(isLevel(i.level)).toBe(true);
  });

  it.each(packs.map((p) => [p.id, p] as const))(
    '%s : une partie a toujours toutes ses manches, quel que soit le niveau',
    (_, pack) => {
      const wanted = Math.min(DEFAULT_ROUNDS, pack.items.length);
      for (const { value } of LEVELS) {
        const out = drawForLevel(pack.items, DEFAULT_ROUNDS, value, cardLevel);
        expect(out).toHaveLength(wanted);
        expect(new Set(out).size).toBe(wanted);
      }
    },
  );
});
