import { Dexie, type EntityTable } from 'dexie';

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

export interface Setting {
  key: string;
  value: unknown;
}

/** Base locale : rien ne quitte l'appareil. */
export const db = new Dexie('dis-moi') as Dexie & {
  players: EntityTable<Player, 'id'>;
  settings: EntityTable<Setting, 'key'>;
  games: EntityTable<GameRecord, 'id'>;
};

db.version(1).stores({
  players: '++id, createdAt',
  settings: 'key',
});

db.version(2).stores({
  games: '++id, startedAt, gameId',
});
