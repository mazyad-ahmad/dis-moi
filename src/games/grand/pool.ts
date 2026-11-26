import { customDeck, customRouteId } from '../../data/customGames';
import type { CustomGame } from '../../data/db';
import { findCatalogueGame } from '../catalogue/catalogue';
import { SONGS, type Song } from '../chanson/songs';
import { cardKey } from '../deck/cardKey';
import type { Deck, DeckItem, DeckKind } from '../deck/types';
import { DRAW_WORDS } from '../dessin/words';
import { DIGITS, LETTERS, type GlyphCard } from '../lettres/bank';
import type { GameInfo } from '../registry';
import { shuffle } from '../shuffle';

/**
 * Le Grand Jeu (#41) : chaque manche tire un jeu de l'accueil, puis une carte de ce jeu.
 * Partie enregistrée sous son propre identifiant.
 */
export const GRAND_ID = 'grand-jeu';
export const GRAND_NAME = 'Le Grand Jeu';
/** Il faut au moins deux jeux pour varier les manches. */
export const MIN_GRAND_GAMES = 2;

/** Une carte jouable dans le Grand Jeu, avec sa clé stable (pour reprendre la partie). */
export type GrandCard = { key: string } & (
  | { type: 'song'; song: Song }
  | { type: 'glyph'; glyph: GlyphCard }
  | { type: 'draw'; word: string }
  | { type: 'deck'; kind: DeckKind; item: DeckItem }
);

export interface GrandGame extends GameInfo {
  cards: GrandCard[];
}

const songCards = (): GrandCard[] => SONGS.map((song) => ({ key: song.id, type: 'song', song }));
const glyphCards = (): GrandCard[] =>
  [...LETTERS, ...DIGITS].map((glyph) => ({ key: glyph.glyph, type: 'glyph', glyph }));
const wordCards = (words: readonly string[]): GrandCard[] =>
  [...new Set(words)].map((word) => ({ key: word, type: 'draw', word }));

function deckCards(deck: Deck): GrandCard[] {
  if (deck.kind === 'draw') return wordCards(deck.items.map((i) => i.answer));
  return deck.items.map((item, i) => ({
    key: cardKey(item, i),
    type: 'deck',
    kind: deck.kind,
    item,
  }));
}

/** Cartes des jeux de base, par identifiant (un jeu de base inconnu ici est laissé de côté). */
const BASE_CARDS: Record<string, () => GrandCard[]> = {
  chanson: songCards,
  lettres: glyphCards,
  dessin: () => wordCards(DRAW_WORDS),
};

function cardsOf(game: GameInfo, custom: CustomGame[]): GrandCard[] {
  const base = BASE_CARDS[game.id];
  if (base) return base();
  const catalogue = findCatalogueGame(game.id);
  if (catalogue) return deckCards(catalogue);
  const created = custom.find((g) => customRouteId(g.id) === game.id);
  return created ? deckCards(customDeck(created)) : [];
}

/** Jeux de l'accueil jouables dans le Grand Jeu (les jeux sans carte sont laissés de côté). */
export function grandGames(home: GameInfo[], custom: CustomGame[]): GrandGame[] {
  return home
    .map((game) => ({ ...game, cards: cardsOf(game, custom) }))
    .filter((g) => g.cards.length > 0);
}

/**
 * Jeux inclus : tous sauf ceux que le parent a retirés. S'il en reste moins de deux
 * (jeux supprimés depuis), on reprend tous les jeux pour garder des manches variées.
 */
export function includedGames<T extends { id: string }>(games: T[], excluded: string[]): T[] {
  const kept = games.filter((g) => !excluded.includes(g.id));
  return kept.length >= MIN_GRAND_GAMES ? kept : games;
}

/** Une manche prévue : identifiant du jeu et clé de la carte. */
export interface PlannedRound {
  game: string;
  card: string;
}

/**
 * Prévoit les manches : les jeux passent chacun leur tour dans un ordre mélangé, sans que
 * deux manches de suite utilisent le même jeu (dès qu'il y en a au moins deux). Dans chaque
 * jeu, les cartes sont tirées sans répétition tant qu'il en reste.
 */
export function planRounds(
  games: GrandGame[],
  rounds: number,
  random: () => number = Math.random,
): PlannedRound[] {
  if (!games.length) return [];
  const order: GrandGame[] = [];
  while (order.length < rounds) {
    const cycle = shuffle(games, random);
    if (cycle.length > 1 && cycle[0] === order[order.length - 1]) cycle.push(cycle.shift()!);
    order.push(...cycle);
  }
  const queues = new Map<string, GrandCard[]>();
  return order.slice(0, rounds).map((game) => {
    let queue = queues.get(game.id);
    if (!queue?.length) queues.set(game.id, (queue = shuffle(game.cards, random)));
    return { game: game.id, card: queue.shift()!.key };
  });
}

export interface GrandRound {
  game: GrandGame;
  card: GrandCard;
}

/** Retrouve les manches prévues ; `undefined` si un jeu ou une carte n'existe plus. */
export function resolvePlan(saved: unknown, games: GrandGame[]): GrandRound[] | undefined {
  if (!Array.isArray(saved) || !saved.length) return undefined;
  const out: GrandRound[] = [];
  for (const r of saved as Partial<PlannedRound>[]) {
    const game = games.find((g) => g.id === r?.game);
    const card = game?.cards.find((c) => c.key === r?.card);
    if (!game || !card) return undefined;
    out.push({ game, card });
  }
  return out;
}

/** « Maintenant : Mime ça ! » (pas de « ! » après un nom qui finit déjà par « ? »). */
export function announce(title: string): string {
  return `Maintenant : ${title}${/[?!]$/.test(title) ? '' : ' !'}`;
}
