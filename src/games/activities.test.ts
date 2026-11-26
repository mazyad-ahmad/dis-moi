import {
  ACTIVITIES,
  ageLabel,
  filterGames,
  groupByActivity,
  homeSections,
  HOME_GROUP_FROM,
  levelsOf,
  playLevels,
  type Sortable,
} from './activities';
import { CATALOGUE } from './catalogue/catalogue';
import { ON_SCREEN, ORAL } from './modes';
import { GAMES } from './registry';

describe('chaque jeu intégré se range (#137)', () => {
  const builtIn = [...GAMES, ...CATALOGUE];

  it.each(builtIn.map((g) => [g.name, g] as const))(
    '%s : au moins un type, une tranche d’âge et ce qu’il fait travailler',
    (_, game) => {
      expect(game.activities?.length).toBeGreaterThan(0);
      for (const a of game.activities!) expect(ACTIVITIES.map((x) => x.value)).toContain(a);
      expect(game.levels?.length).toBeGreaterThan(0);
      expect(ageLabel(game.levels)).toMatch(/ans/);
      expect(game.skill).toMatch(/^\S.{5,60}$/);
    },
  );

  it('la tranche d’âge vient des niveaux des cartes', () => {
    expect(GAMES.find((g) => g.id === 'lettres')!.levels).toEqual([1, 2, 3]);
    expect(levelsOf([{ level: 2 }, { level: 1 }, { level: 2 }])).toEqual([1, 2]);
    // Une carte sans niveau (jeu créé) convient à tous, un jeu sans carte aussi.
    expect(levelsOf([{ level: 3 }, {}])).toEqual([1, 2, 3]);
    expect(levelsOf([])).toEqual([1, 2, 3]);
  });

  it('dit la tranche d’âge en clair', () => {
    expect(ageLabel([1, 2, 3])).toBe('Dès 3 ans');
    expect(ageLabel([2, 3])).toBe('Dès 5 ans');
    expect(ageLabel([1])).toBe('3-4 ans');
    expect(ageLabel([1, 2])).toBe('3 à 6 ans');
    expect(ageLabel(undefined)).toBe('Dès 3 ans');
  });
});

const game = (name: string, extra: Partial<Sortable> = {}): Sortable => ({
  name,
  activities: ['parler'],
  levels: [1, 2, 3],
  needs: ORAL,
  ...extra,
});

describe('filtres', () => {
  const games = [
    game('Écoute', { activities: ['ecouter'], skill: 'Exerce l’oreille' }),
    game('Petits mots', { levels: [1] }),
    game('Grandes énigmes', { levels: [3] }),
    game('Mime', { activities: ['bouger'], needs: { looks: true, moves: true } }),
    game('Image', { needs: ON_SCREEN }),
    game('Sans déclaration', { needs: undefined, activities: undefined, levels: undefined }),
  ];
  const names = (list: Sortable[]) => list.map((g) => g.name);

  it('sans filtre, tous les jeux restent visibles', () => {
    expect(filterGames(games, {})).toEqual(games);
    expect(filterGames(games, { activity: null, level: null, moment: null, query: ' ' })).toEqual(
      games,
    );
  });

  it('se cumulent : type et âge', () => {
    expect(names(filterGames(games, { activity: 'parler' }))).toEqual([
      'Petits mots',
      'Grandes énigmes',
      'Image',
    ]);
    expect(names(filterGames(games, { activity: 'parler', level: 1 }))).toEqual([
      'Petits mots',
      'Image',
    ]);
    // Un jeu sans tranche d'âge convient à tous les âges.
    expect(names(filterGames(games, { level: 3 }))).toContain('Sans déclaration');
  });

  it('raccourcis par moment : ceux du mode Coucher ou Voiture', () => {
    expect(names(filterGames(games, { moment: 'coucher' }))).not.toContain('Mime');
    expect(names(filterGames(games, { moment: 'coucher' }))).not.toContain('Sans déclaration');
    expect(names(filterGames(games, { moment: 'voiture' }))).toEqual([
      'Écoute',
      'Petits mots',
      'Grandes énigmes',
    ]);
  });

  it('recherche sans accents ni majuscules, dans le nom, le type et ce qu’il fait travailler', () => {
    expect(names(filterGames(games, { query: 'ecoute' }))).toEqual(['Écoute']);
    expect(names(filterGames(games, { query: 'OREILLE' }))).toEqual(['Écoute']);
    expect(names(filterGames(games, { query: 'bouger' }))).toEqual(['Mime']);
  });

  it('groupe par premier type, dans l’ordre des types, sans groupe vide', () => {
    const groups = groupByActivity([
      game('A', { activities: ['bouger'] }),
      game('B', { activities: ['ecouter', 'bouger'] }),
      game('C', { activities: undefined }),
    ]);
    expect(groups.map((g) => [g.activity, names(g.games)])).toEqual([
      ['ecouter', ['B']],
      ['parler', ['C']],
      ['bouger', ['A']],
    ]);
  });
});

describe('accueil', () => {
  it('niveaux du jour : celui de la partie, sinon ceux des joueurs actifs', () => {
    expect(playLevels([], null)).toEqual([]);
    expect(playLevels([{}, { level: 3 }, { level: 1 }, { level: 3 }], null)).toEqual([1, 3]);
    expect(playLevels([{ level: 3 }], 2)).toEqual([2]);
  });

  it('peu de jeux : une seule grille, rien de caché ; ceux des joueurs du jour d’abord', () => {
    const games = [game('Grands', { levels: [3] }), game('Tous'), game('Petits', { levels: [1] })];
    expect(homeSections(games, [])).toEqual([{ games }]);
    expect(homeSections(games, [1])).toEqual([
      { games: [games[1], games[2]] },
      { title: 'Pour d’autres âges', games: [games[0]] },
    ]);
  });

  it('beaucoup de jeux : un groupe par type, toujours sans rien cacher', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      game(`Jeu ${i}`, {
        activities: [ACTIVITIES[i % ACTIVITIES.length].value],
        levels: i === 0 ? [3] : [1, 2, 3],
      }),
    );
    expect(many.length).toBeGreaterThanOrEqual(HOME_GROUP_FROM);
    const sections = homeSections(many, [1]);
    expect(sections.map((s) => s.title)).toEqual([
      ...ACTIVITIES.map((a) => a.name),
      'Pour d’autres âges',
    ]);
    expect(sections.flatMap((s) => s.games)).toHaveLength(30);
    expect(sections.at(-1)!.games.map((g) => g.name)).toEqual(['Jeu 0']);
  });
});
