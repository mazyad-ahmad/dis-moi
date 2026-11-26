import { Dexie, type EntityTable } from 'dexie';
import type { DeckItem, DeckKind } from '../games/deck/types';

export interface Player {
  id: number;
  name: string;
  color: PlayerColor;
  createdAt: number;
}

export type PlayerColor = 'meadow' | 'sky' | 'dawn';
export const PLAYER_COLORS: PlayerColor[] = ['meadow', 'sky', 'dawn'];

export type Theme = 'auto' | 'light' | 'night';

/** Une partie jouée, enregistrée au fil des manches (les étoiles sont gardées si on quitte). */
export interface GameRecord {
  id: number;
  gameId: string;
  startedAt: number;
  updatedAt: number;
  /** Manches jouées (Trouvé ou Passer). */
  played: number;
  rounds: number;
  stars: number;
  /** Joueurs présents au lancement de la partie. */
  playerIds: number[];
}

/** Jeu créé par le parent (#10). Les photos et sons sont des Blob dans les cartes. */
export interface CustomGame {
  id: number;
  name: string;
  kind: DeckKind;
  items: DeckItem[];
  createdAt: number;
  updatedAt: number;
}

/** Félicitation enregistrée au micro par le parent (#116), jouée au « Trouvé ». */
export interface Praise {
  id: number;
  audio: Blob;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

/** Base locale : rien ne quitte l'appareil. */
export const db = new Dexie('dis-moi') as Dexie & {
  players: EntityTable<Player, 'id'>;
  settings: EntityTable<Setting, 'key'>;
  games: EntityTable<GameRecord, 'id'>;
  customGames: EntityTable<CustomGame, 'id'>;
  praises: EntityTable<Praise, 'id'>;
};

db.version(1).stores({
  players: '++id, createdAt',
  settings: 'key',
});

db.version(2).stores({
  games: '++id, startedAt, gameId',
});

db.version(3).stores({
  customGames: '++id, createdAt',
});

db.version(4).stores({
  praises: '++id, createdAt',
});
