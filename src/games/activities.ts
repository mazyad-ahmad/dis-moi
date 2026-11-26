import type { DeckKind } from './deck/types';
import { cardLevel, LEVELS, levelInfo, type Level } from './levels';
import { suitsMode, type GameMode, type PlayNeeds } from './modes';

/**
 * Trouver le bon jeu (#137) : chaque jeu déclare un ou plusieurs types (ce que fait l'enfant),
 * une tranche d'âge (déduite des niveaux de ses cartes) et ce qu'il fait travailler.
 * Ce module ne contient que des données et des fonctions pures : filtres d'« Ajouter un jeu »,
 * groupes et ordre de l'accueil.
 */
export type Activity = 'ecouter' | 'parler' | 'lire-compter' | 'dessiner' | 'bouger' | 'calme';

export interface ActivityInfo {
  value: Activity;
  /** Nom court montré au parent. */
  name: string;
}

/** Types de jeu, dans l'ordre des groupes. */
export const ACTIVITIES: readonly ActivityInfo[] = [
  { value: 'ecouter', name: 'Écouter' },
  { value: 'parler', name: 'Parler' },
  { value: 'lire-compter', name: 'Lire et compter' },
  { value: 'dessiner', name: 'Dessiner' },
  { value: 'bouger', name: 'Bouger' },
  { value: 'calme', name: 'Se calmer' },
];

export function isActivity(value: unknown): value is Activity {
  return ACTIVITIES.some((a) => a.value === value);
}

export function activityName(activity: Activity): string {
  return ACTIVITIES.find((a) => a.value === activity)!.name;
}

/** Type proposé à la création d'un jeu, d'après sa façon de jouer les cartes. */
export const KIND_ACTIVITY: Record<DeckKind, Activity> = {
  sound: 'ecouter',
  image: 'parler',
  draw: 'dessiner',
  question: 'parler',
};

/** Tous les niveaux : un jeu sans tranche d'âge convient à tous. */
export const ALL_LEVELS: readonly Level[] = LEVELS.map((l) => l.value);

/**
 * Tranche d'âge d'un jeu, d'après les niveaux de ses cartes, du plus petit au plus grand.
 * Une carte sans niveau convient à tous ; un jeu sans carte aussi.
 */
export function levelsOf(items: readonly { level?: number }[]): Level[] {
  const levels = items.map(cardLevel);
  if (!levels.length || levels.includes(undefined)) return [...ALL_LEVELS];
  return [...new Set(levels as Level[])].sort((a, b) => a - b);
}

/** Tranche d'âge en clair : « Dès 3 ans », « 3-4 ans », « 3 à 6 ans ». */
export function ageLabel(levels: readonly Level[] | undefined): string {
  const list = levels?.length ? levels : ALL_LEVELS;
  const low = levelInfo(Math.min(...list) as Level);
  const high = levelInfo(Math.max(...list) as Level);
  if (high.maxAge === undefined) return `Dès ${low.minAge} ans`;
  if (low === high) return low.ages;
  return `${low.minAge} à ${high.maxAge} ans`;
}

/** Ce que le tri a besoin de connaître d'un jeu. */
export interface Sortable {
  name: string;
  activities?: readonly Activity[];
  /** Tranche d'âge (niveaux des cartes) ; absente : tous les âges. */
  levels?: readonly Level[];
  needs?: PlayNeeds;
  /** Ce que le jeu fait travailler, en une phrase. */
  skill?: string;
  desc?: string;
}

/** Le jeu convient-il à l'un de ces niveaux ? Sans niveau demandé, tous les jeux conviennent. */
export function suitsLevels(game: Sortable, levels: readonly Level[]): boolean {
  if (!levels.length || !game.levels?.length) return true;
  return game.levels.some((l) => levels.includes(l));
}

/** Raccourcis par moment (#42) : les jeux qui conviennent à ce mode. */
export type Moment = Extract<GameMode, 'coucher' | 'voiture'>;

export const MOMENTS: readonly { value: Moment; name: string }[] = [
  { value: 'coucher', name: 'Pour le coucher' },
  { value: 'voiture', name: 'Pour la voiture' },
];

export interface GameFilter {
  activity?: Activity | null;
  level?: Level | null;
  moment?: Moment | null;
  query?: string;
}

/** Texte comparé sans majuscules ni accents (« ecoute » trouve « Écoute »). */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Jeux qui passent tous les filtres choisis (ils se cumulent) ; aucun filtre : tous. */
export function filterGames<T extends Sortable>(games: readonly T[], filter: GameFilter): T[] {
  const query = fold(filter.query ?? '');
  return games.filter(
    (g) =>
      (!filter.activity || (g.activities ?? []).includes(filter.activity)) &&
      (!filter.level || suitsLevels(g, [filter.level])) &&
      (!filter.moment || suitsMode(g.needs, filter.moment)) &&
      (!query ||
        [g.name, g.skill, g.desc, ...(g.activities ?? []).map(activityName)].some(
          (text) => text && fold(text).includes(query),
        )),
  );
}

export interface GameGroup<T> {
  activity: Activity;
  games: T[];
}

/**
 * Jeux groupés par type, dans l'ordre des types. Un jeu est rangé sous son premier type
 * (jamais deux fois) ; un jeu sans type va avec « Parler ». Les groupes vides n'apparaissent pas.
 */
export function groupByActivity<T extends Sortable>(games: readonly T[]): GameGroup<T>[] {
  return ACTIVITIES.map(({ value }) => ({
    activity: value,
    games: games.filter((g) => (g.activities?.[0] ?? 'parler') === value),
  })).filter((group) => group.games.length > 0);
}

/** Types présents parmi ces jeux, dans l'ordre des types (pour ne proposer que des filtres utiles). */
export function activitiesOf(games: readonly Sortable[]): ActivityInfo[] {
  return ACTIVITIES.filter((a) => games.some((g) => g.activities?.includes(a.value)));
}

/**
 * Niveaux des joueurs du jour : le niveau de la partie s'il est choisi, sinon ceux des joueurs
 * actifs qui en ont un. Aucun : pas d'ordre par âge.
 */
export function playLevels(
  players: readonly { level?: Level }[],
  gameLevel: Level | null | undefined,
): Level[] {
  if (gameLevel) return [gameLevel];
  return [...new Set(players.flatMap((p) => (p.level ? [p.level] : [])))].sort((a, b) => a - b);
}

/** Au-delà de ce nombre de jeux, l'accueil les range par type. */
export const HOME_GROUP_FROM = 7;
/** Au-delà de ce nombre de jeux, « Ajouter un jeu » propose une recherche. */
export const SEARCH_FROM = 21;

export interface HomeSection<T> {
  /** Titre du groupe ; aucun pour la grille simple. */
  title?: string;
  games: T[];
}

/**
 * Grille de l'accueil : d'abord les jeux qui conviennent aux joueurs du jour, puis
 * « Pour d'autres âges ». Peu de jeux : une seule grille, comme avant ; beaucoup : un groupe par
 * type. Aucun jeu n'est caché.
 */
export function homeSections<T extends Sortable>(
  games: readonly T[],
  levels: readonly Level[],
): HomeSection<T>[] {
  const suited = games.filter((g) => suitsLevels(g, levels));
  const others = games.filter((g) => !suitsLevels(g, levels));
  const sections: HomeSection<T>[] =
    games.length >= HOME_GROUP_FROM
      ? groupByActivity(suited).map((g) => ({ title: activityName(g.activity), games: g.games }))
      : [{ games: suited }];
  if (others.length) sections.push({ title: 'Pour d’autres âges', games: others });
  return sections.filter((s) => s.games.length > 0);
}
