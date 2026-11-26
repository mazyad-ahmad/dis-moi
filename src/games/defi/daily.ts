import { useEffect, useState } from 'react';
import type { GameRecord } from '../../data/db';
import { CATALOGUE } from '../catalogue/catalogue';
import { SONGS, type Song } from '../chanson/songs';
import type { DeckItem } from '../deck/types';
import { DRAW_WORDS } from '../dessin/words';
import { DIGITS, LETTERS, type GlyphCard } from '../lettres/bank';
import { needsOf, type PlayNeeds } from '../modes';
import { TETE_ID } from '../tete/tilt';
import { MAINS_ID } from '../mains/mains';
import { SITUATION_ID } from '../situation/situation';

/**
 * Défi du jour (#43) : une carte surprise par jour, tirée de tous les jeux intégrés.
 * Le tirage ne dépend que de la date du téléphone : la même carte toute la journée,
 * une nouvelle à minuit, sans réseau ni rien à enregistrer.
 * Réussi, il rapporte une étoile bonus (une partie « defi » dans l'historique).
 * Aucune série : un jour manqué ne laisse aucune trace.
 */
export const DAILY_ID = 'defi';
export const DAILY_NAME = 'Défi du jour';

export type DailyCard =
  | { kind: 'glyph'; card: GlyphCard }
  | { kind: 'melody'; song: Song }
  | { kind: 'draw'; word: string }
  | { kind: 'sound' | 'image' | 'question'; item: DeckItem };

export interface DailySource {
  /** Jeu d'origine de la carte. */
  game: string;
  name: string;
  category: string;
  /** Ce que la carte demande à l'enfant (#42) : le défi est masqué si le mode ne s'y prête pas. */
  needs: PlayNeeds;
  cards: DailyCard[];
}

/** Tous les jeux intégrés, même ceux du catalogue pas encore ajoutés à l'accueil. */
export const DAILY_SOURCES: DailySource[] = [
  {
    game: 'chanson',
    name: 'Quelle chanson ?',
    category: 'Musique',
    needs: needsOf('melody'),
    cards: SONGS.map((song) => ({ kind: 'melody', song })),
  },
  {
    game: 'lettres',
    name: 'Quelle lettre ?',
    category: 'Lettres et chiffres',
    needs: needsOf('glyph'),
    cards: LETTERS.map((card) => ({ kind: 'glyph', card })),
  },
  {
    game: 'lettres',
    name: 'Quel chiffre ?',
    category: 'Lettres et chiffres',
    needs: needsOf('glyph'),
    cards: DIGITS.map((card) => ({ kind: 'glyph', card })),
  },
  {
    game: 'dessin',
    name: 'Dessine ça',
    category: 'Dessin',
    needs: needsOf('draw'),
    cards: DRAW_WORDS.map((word) => ({ kind: 'draw', word })),
  },
  // Devine-tête (#67) demande le téléphone sur le front, Devine avec tes mains (#134) un sac
  // d'objets préparé : pas des cartes surprises. Que fais-tu si… ? (#133) n'a pas de bonne réponse.
  ...CATALOGUE.filter((g) => ![TETE_ID, MAINS_ID, SITUATION_ID].includes(g.id)).map(
    (g): DailySource => ({
      game: g.id,
      name: g.name,
      category: g.category,
      needs: g.needs,
      cards: g.items.map((item) => ({ kind: g.kind as 'sound' | 'image' | 'question', item })),
    }),
  ),
];

/** Jour du téléphone (heure locale), « 2026-11-26 » : change à minuit. */
export function dayKey(time: number | Date = Date.now()): string {
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Empreinte FNV-1a 32 bits, bien mélangée : un nombre stable pour un texte donné. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Finition de MurmurHash3 : deux dates voisines donnent des nombres très différents.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export interface DailyPick {
  source: DailySource;
  card: DailyCard;
}

/** Carte du jour : d'abord le jeu, puis la carte, pour que chaque jeu ait sa chance. */
export function dailyPick(day: string, sources: DailySource[] = DAILY_SOURCES): DailyPick {
  const source = sources[hash(day) % sources.length];
  const card = source.cards[hash(`${day}:${source.name}`) % source.cards.length];
  return { source, card };
}

/** Le défi du jour a-t-il déjà été réussi ? */
export function dailyDone(records: GameRecord[], day: string): boolean {
  return records.some((r) => r.gameId === DAILY_ID && r.stars > 0 && dayKey(r.startedAt) === day);
}

/** Millisecondes jusqu'au prochain minuit (heure du téléphone). */
export function msToMidnight(now = Date.now()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now;
}

/**
 * Jour en cours, mis à jour à minuit si l'appli reste ouverte, et au retour sur l'appli
 * (un minuteur peut dormir avec le téléphone).
 */
export function useToday(): string {
  const [day, setDay] = useState(() => dayKey());
  useEffect(() => {
    const refresh = () => setDay(dayKey());
    const timer = window.setTimeout(refresh, msToMidnight() + 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [day]);
  return day;
}

/** Mots gentils après un défi réussi, jamais de reproche les autres jours. */
export const KIND_WORDS = [
  'Quelle belle équipe !',
  'Vous avez été super !',
  'Bravo, c’était un vrai défi !',
  'Bien joué tous ensemble !',
] as const;

export function kindWord(day: string): string {
  return KIND_WORDS[hash(`${day}:mot`) % KIND_WORDS.length];
}
