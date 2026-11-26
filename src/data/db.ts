import { Dexie, type EntityTable } from 'dexie';
import type { Activity } from '../games/activities';
import type { DeckItem, DeckKind } from '../games/deck/types';
import type { Level } from '../games/levels';
import type { GameMode } from '../games/modes';

export interface Player {
  id: number;
  name: string;
  color: PlayerColor;
  /** Animal de l'avatar (#39), pour l'enfant qui ne lit pas encore son prénom. */
  animal: PlayerAnimal;
  createdAt: number;
  /** Niveau par âge (#40), facultatif (champ non indexé : pas de migration). */
  level?: Level;
}

export type PlayerColor = 'meadow' | 'sky' | 'dawn' | 'rose' | 'lilac' | 'ember';
export const PLAYER_COLORS: PlayerColor[] = ['meadow', 'sky', 'dawn', 'rose', 'lilac', 'ember'];

/** Animaux proposés pour l'avatar : l'identifiant est aussi le nom lu (« Léa, renard »). */
export const PLAYER_ANIMALS = [
  { id: 'renard', emoji: '🦊' },
  { id: 'ours', emoji: '🐻' },
  { id: 'lapin', emoji: '🐰' },
  { id: 'chat', emoji: '🐱' },
  { id: 'chien', emoji: '🐶' },
  { id: 'lion', emoji: '🦁' },
  { id: 'panda', emoji: '🐼' },
  { id: 'grenouille', emoji: '🐸' },
  { id: 'tortue', emoji: '🐢' },
  { id: 'hibou', emoji: '🦉' },
  { id: 'pingouin', emoji: '🐧' },
  { id: 'koala', emoji: '🐨' },
] as const;
export type PlayerAnimal = (typeof PLAYER_ANIMALS)[number]['id'];

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
  /** Façon de jouer (#42) ; absente : partie normale (ou d'avant les modes). */
  mode?: GameMode;
  /** Tour par tour (#38) : qui a joué chaque manche, dans l'ordre (aucun score par joueur). */
  turns?: number[];
}

/** Jeu créé par le parent (#10). Les photos et sons sont des Blob dans les cartes. */
export interface CustomGame {
  id: number;
  name: string;
  kind: DeckKind;
  items: DeckItem[];
  /** Type choisi à la création (#137) ; absent : d'après `kind`. */
  activity?: Activity;
  /** Âge facultatif (#137) : niveau visé ; absent : tous les âges. */
  level?: Level;
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

// Avatars (#39) : chaque joueur existant reçoit un animal, dans l'ordre d'ajout ; sa couleur est gardée.
db.version(5)
  .stores({})
  .upgrade(async (tx) => {
    const players = tx.table<Player, number>('players');
    const list = await players.orderBy('createdAt').toArray();
    await Promise.all(
      list.map((p, i) =>
        players.update(p.id, {
          animal: PLAYER_ANIMALS[i % PLAYER_ANIMALS.length].id,
          color: PLAYER_COLORS.includes(p.color)
            ? p.color
            : PLAYER_COLORS[i % PLAYER_COLORS.length],
        }),
      ),
    );
  });
