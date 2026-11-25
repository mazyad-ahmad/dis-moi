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

export interface Setting {
  key: string;
  value: unknown;
}

/** Base locale : rien ne quitte l'appareil. */
export const db = new Dexie('dis-moi') as Dexie & {
  players: EntityTable<Player, 'id'>;
  settings: EntityTable<Setting, 'key'>;
};

db.version(1).stores({
  players: '++id, createdAt',
  settings: 'key',
});
