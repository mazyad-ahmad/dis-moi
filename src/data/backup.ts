import { CustomGameError } from './customGames';
import {
  db,
  PLAYER_ANIMALS,
  PLAYER_COLORS,
  type CustomGame,
  type GameRecord,
  type Player,
} from './db';
import {
  decodeGame,
  encodeGame,
  shareFile,
  uniqueGameName,
  type GameFile,
  type SharedGame,
} from './gameFile';
import { isLevel } from '../games/levels';
import { isGameMode } from '../games/modes';
import type { TeamScore } from '../games/teams';
import { TURN_MODES } from '../games/turns';
import { cleanName, isAnimal, isPlayerColor, MAX_PLAYERS, PlayerError } from './players';
import {
  DEFAULT_SETTINGS,
  DRAW_SECONDS_CHOICES,
  loadSettings,
  READ_ALOUD_CHOICES,
  ROUND_CHOICES,
  setSetting,
  VOLUME_CHOICES,
  type Settings,
} from './settings';
import { requestPersistentStorage } from './storage';

/**
 * Sauvegarde complète (#25) : joueurs, parties, réglages et jeux créés avec leurs médias,
 * dans un seul fichier JSON que le parent garde où il veut. Rien ne part sans son geste.
 */
export const BACKUP_FORMAT = 'dis-moi/sauvegarde';
export const BACKUP_VERSION = 1;
export const BACKUP_EXT = '.dismoi-sauvegarde.json';
/** Plusieurs jeux créés avec photos et sons tiennent largement dans cette taille. */
export const MAX_BACKUP_SIZE = 200 * 1024 * 1024;
/** Au-delà, un rappel discret propose de sauvegarder (s'il y a des jeux créés). */
export const BACKUP_REMINDER_DAYS = 30;

export class BackupError extends Error {}

const INVALID = 'Ce fichier n’est pas une sauvegarde Dis-moi.';

interface BackupGame extends GameFile {
  id: number;
  createdAt: number;
  updatedAt: number;
}

interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: number;
  players: Player[];
  games: GameRecord[];
  settings: Partial<Settings>;
  customGames: BackupGame[];
}

/** Sauvegarde lue et vérifiée, prête à être restaurée. */
export interface Backup {
  createdAt: number;
  players: Player[];
  games: GameRecord[];
  settings: Partial<Settings>;
  customGames: CustomGame[];
}

/** Réglages gardés sur le téléphone seulement : les équipes de la fête (#44), invités compris. */
const LOCAL_ONLY = new Set<string>(['teams']);

export async function createBackupFile(now = Date.now()): Promise<File> {
  const [players, games, customGames] = await Promise.all([
    db.players.toArray(),
    db.games.toArray(),
    db.customGames.toArray(),
  ]);
  const settings: Partial<Settings> = {};
  for (const { key, value } of await db.settings.toArray())
    if (key in DEFAULT_SETTINGS && !LOCAL_ONLY.has(key))
      (settings as Record<string, unknown>)[key] = value;

  const content: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: now,
    players,
    games,
    settings,
    customGames: await Promise.all(
      customGames.map(async (g) => ({
        ...(await encodeGame(g)),
        id: g.id,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
    ),
  };
  return new File([JSON.stringify(content)], backupFileName(now), { type: 'application/json' });
}

/** « dis-moi-sauvegarde-2026-11-25.dismoi-sauvegarde.json » (date locale). */
export function backupFileName(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `dis-moi-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}${BACKUP_EXT}`;
}

/** Sauvegarder tout : partage Android ou téléchargement, puis date de la sauvegarde notée. */
export async function saveBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const now = Date.now();
  const result = await shareFile(await createBackupFile(now), 'Sauvegarde Dis-moi');
  if (result !== 'cancelled') {
    await setSetting('lastBackupAt', now);
    void requestPersistentStorage();
  }
  return result;
}

// ---------- Lecture ----------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isId = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;

function fail(message = INVALID): never {
  throw new BackupError(message);
}

function readPlayer(raw: unknown, index: number): Player {
  if (!isObject(raw) || !isId(raw.id) || typeof raw.name !== 'string') fail();
  let name: string;
  try {
    name = cleanName(raw.name);
  } catch {
    fail();
  }
  const color = isPlayerColor(raw.color) ? raw.color : PLAYER_COLORS[0];
  // Sauvegarde d'avant les avatars (#39) : un animal par joueur, comme à la migration.
  const animal = isAnimal(raw.animal)
    ? raw.animal
    : PLAYER_ANIMALS[index % PLAYER_ANIMALS.length].id;
  return {
    id: raw.id,
    name,
    color,
    animal,
    createdAt: isNumber(raw.createdAt) ? raw.createdAt : 0,
    // Niveau par âge (#40) : facultatif, ignoré s'il est inconnu.
    ...(isLevel(raw.level) && { level: raw.level }),
  };
}

function isTeamScores(v: unknown): v is TeamScore[] {
  return (
    Array.isArray(v) &&
    v.every(
      (t) =>
        isObject(t) &&
        typeof t.name === 'string' &&
        isPlayerColor(t.color) &&
        Number.isInteger(t.stars) &&
        Number.isInteger(t.children),
    )
  );
}

function readRecord(raw: unknown): GameRecord {
  if (!isObject(raw) || !isId(raw.id) || typeof raw.gameId !== 'string') fail();
  const { played, rounds, stars, startedAt, updatedAt } = raw;
  if (![played, rounds, stars, startedAt].every(isNumber)) fail();
  if (!Array.isArray(raw.playerIds) || !raw.playerIds.every(isId)) fail();
  return {
    id: raw.id,
    gameId: raw.gameId,
    startedAt: startedAt as number,
    updatedAt: isNumber(updatedAt) ? updatedAt : (startedAt as number),
    played: played as number,
    rounds: rounds as number,
    stars: stars as number,
    playerIds: raw.playerIds,
    // Façon de jouer (#42) : facultative, ignorée si elle est inconnue.
    ...(isGameMode(raw.mode) && { mode: raw.mode }),
    // Tour par tour (#38) : facultatif, ignoré s'il est illisible.
    ...(Array.isArray(raw.turns) && raw.turns.every(isId) && { turns: raw.turns }),
    // En équipes (#44) : facultatif, ignoré s'il est illisible.
    ...(isTeamScores(raw.teams) && { teams: raw.teams }),
  };
}

function readCustomGame(raw: unknown): CustomGame {
  if (!isObject(raw) || !isId(raw.id)) fail();
  let game: SharedGame;
  try {
    game = decodeGame(raw);
  } catch (e) {
    // Jeu illisible : le message du jeu (version trop récente…) est le plus utile.
    fail(e instanceof CustomGameError ? `Jeu « ${String(raw.name)} » : ${e.message}` : INVALID);
  }
  const createdAt = isNumber(raw.createdAt) ? raw.createdAt : 0;
  return {
    ...game,
    id: raw.id,
    createdAt,
    updatedAt: isNumber(raw.updatedAt) ? raw.updatedAt : createdAt,
  };
}

/** Réglages connus et valides ; les autres sont ignorés (sauvegarde d'une version future). */
function readSettings(raw: unknown): Partial<Settings> {
  if (!isObject(raw)) fail();
  const out: Partial<Settings> = {};
  if (['auto', 'light', 'night'].includes(raw.theme as string))
    out.theme = raw.theme as Settings['theme'];
  if ((ROUND_CHOICES as readonly unknown[]).includes(raw.rounds)) out.rounds = raw.rounds as number;
  if ((DRAW_SECONDS_CHOICES as readonly unknown[]).includes(raw.drawSeconds))
    out.drawSeconds = raw.drawSeconds as number;
  if (Array.isArray(raw.catalogue) && raw.catalogue.every((c) => typeof c === 'string'))
    out.catalogue = raw.catalogue;
  if (isNumber(raw.lastBackupAt)) out.lastBackupAt = raw.lastBackupAt;
  if (typeof raw.vibrations === 'boolean') out.vibrations = raw.vibrations;
  if ((READ_ALOUD_CHOICES as readonly unknown[]).includes(raw.readAloud))
    out.readAloud = raw.readAloud as Settings['readAloud'];
  if (typeof raw.sounds === 'boolean') out.sounds = raw.sounds;
  if (typeof raw.praise === 'boolean') out.praise = raw.praise;
  if (typeof raw.dailyChallenge === 'boolean') out.dailyChallenge = raw.dailyChallenge;
  if (typeof raw.showChoices === 'boolean') out.showChoices = raw.showChoices;
  if ((VOLUME_CHOICES as readonly unknown[]).includes(raw.volume))
    out.volume = raw.volume as Settings['volume'];
  if (raw.gameLevel === null || isLevel(raw.gameLevel)) out.gameLevel = raw.gameLevel;
  if (isGameMode(raw.gameMode)) out.gameMode = raw.gameMode;
  if ((TURN_MODES as readonly unknown[]).includes(raw.turnMode))
    out.turnMode = raw.turnMode as Settings['turnMode'];
  if (Array.isArray(raw.grandExcluded) && raw.grandExcluded.every((c) => typeof c === 'string'))
    out.grandExcluded = raw.grandExcluded;
  return out;
}

/** Copie sans identifiant : la base en donne un nouveau. */
function withoutId<T extends { id: number }>(item: T): Omit<T, 'id'> {
  const copy: Partial<T> = { ...item };
  delete copy.id;
  return copy as Omit<T, 'id'>;
}

function unique<T>(items: T[], key: (t: T) => unknown) {
  if (new Set(items.map(key)).size !== items.length) fail();
}

/** Lit et vérifie tout le fichier avant de toucher à la base. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    fail();
  }
  if (!isObject(data) || data.format !== BACKUP_FORMAT) fail();
  if (!isNumber(data.version)) fail();
  if (data.version > BACKUP_VERSION)
    fail('Cette sauvegarde vient d’une version plus récente de Dis-moi. Mets l’appli à jour.');
  if (!isNumber(data.createdAt)) fail();
  if (![data.players, data.games, data.customGames].every(Array.isArray)) fail();

  const players = (data.players as unknown[]).map((p, i) => readPlayer(p, i));
  if (players.length > MAX_PLAYERS) fail();
  unique(players, (p) => p.id);
  const games = (data.games as unknown[]).map(readRecord);
  unique(games, (g) => g.id);
  const customGames = (data.customGames as unknown[]).map(readCustomGame);
  unique(customGames, (g) => g.id);
  return {
    createdAt: data.createdAt,
    players,
    games,
    settings: readSettings(data.settings ?? {}),
    customGames,
  };
}

export async function readBackupFile(file: Blob): Promise<Backup> {
  if (file.size > MAX_BACKUP_SIZE) fail('Ce fichier est trop gros.');
  return parseBackup(await file.text());
}

// ---------- Restauration ----------

export type RestoreMode = 'replace' | 'merge';

const TABLES = [db.players, db.games, db.customGames, db.settings];

/** Remplace tout par la sauvegarde, à l'identique (mêmes identifiants). */
async function replaceAll(backup: Backup) {
  await db.transaction('rw', TABLES, async () => {
    await Promise.all(TABLES.map((t) => t.clear()));
    await db.players.bulkAdd(backup.players);
    await db.games.bulkAdd(backup.games);
    await db.customGames.bulkAdd(backup.customGames);
    // Les données sont celles de la sauvegarde : elle compte comme la dernière.
    const settings = { ...backup.settings, lastBackupAt: backup.createdAt };
    await db.settings.bulkPut(Object.entries(settings).map(([key, value]) => ({ key, value })));
  });
}

/**
 * Ajoute la sauvegarde à ce qui est déjà là, sans doublon : joueurs reconnus par leur prénom,
 * parties par leur jeu et leur heure de début, jeux créés par leur type, leur date de création
 * et leurs réponses.
 * Les réglages de ce téléphone sont gardés ; les jeux du catalogue ajoutés s'additionnent.
 */
async function mergeInto(backup: Backup) {
  await db.transaction('rw', TABLES, async () => {
    const key = (name: string) => name.toLocaleLowerCase('fr');
    const players = await db.players.toArray();
    const byName = new Map(players.map((p) => [key(p.name), p.id]));
    const newPlayers = backup.players.filter((p) => !byName.has(key(p.name)));
    if (players.length + newPlayers.length > MAX_PLAYERS)
      throw new PlayerError(
        `Avec cette sauvegarde, il y aurait plus de ${MAX_PLAYERS} joueurs. Choisis « Tout remplacer », ou retire des joueurs d’abord.`,
      );
    for (const p of newPlayers) {
      const id = await db.players.add({
        name: p.name,
        color: p.color,
        animal: p.animal,
        createdAt: p.createdAt,
        ...(p.level && { level: p.level }),
      } as Player);
      byName.set(key(p.name), id);
    }
    const playerId = new Map(backup.players.map((p) => [p.id, byName.get(key(p.name))!]));

    const seen = new Set((await db.games.toArray()).map((g) => `${g.gameId}@${g.startedAt}`));
    const games = backup.games
      .filter((g) => !seen.has(`${g.gameId}@${g.startedAt}`))
      .map((g) => ({
        ...withoutId(g),
        playerIds: g.playerIds.flatMap((id) => (playerId.has(id) ? [playerId.get(id)!] : [])),
        ...(g.turns && {
          turns: g.turns.flatMap((id) => (playerId.has(id) ? [playerId.get(id)!] : [])),
        }),
      }));
    await db.games.bulkAdd(games as GameRecord[]);

    const existing = await db.customGames.toArray();
    // Un jeu renommé « (2) » à la fusion précédente reste le même jeu.
    const gameKey = (g: Omit<CustomGame, 'id'>) =>
      JSON.stringify([g.kind, g.createdAt, g.items.map((it) => it.answer)]);
    const sameGame = new Set(existing.map(gameKey));
    const names = new Set(existing.map((g) => g.name));
    for (const g of backup.customGames.map(withoutId)) {
      if (sameGame.has(gameKey(g))) continue;
      const name = uniqueGameName(g.name, names);
      names.add(name);
      await db.customGames.add({ ...g, name } as CustomGame);
    }

    const catalogue = (await db.settings.get('catalogue'))?.value as string[] | undefined;
    const merged = [...new Set([...(catalogue ?? []), ...(backup.settings.catalogue ?? [])])];
    await db.settings.put({ key: 'catalogue', value: merged });
  });
}

export async function restoreBackup(backup: Backup, mode: RestoreMode): Promise<void> {
  if (mode === 'replace') await replaceAll(backup);
  else await mergeInto(backup);
  await loadSettings();
  void requestPersistentStorage();
}

/** Ce que contient une sauvegarde, pour la confirmation. */
export function backupSummary(backup: Backup) {
  return {
    players: backup.players.length,
    games: backup.games.length,
    stars: backup.games.reduce((n, g) => n + g.stars, 0),
    customGames: backup.customGames.length,
  };
}

/** Rappel : jeux créés et aucune sauvegarde depuis plus de 30 jours (ou jamais). */
export function needsBackupReminder(
  lastBackupAt: number | null,
  customGames: number,
  now = Date.now(),
): boolean {
  if (customGames === 0) return false;
  return lastBackupAt === null || now - lastBackupAt > BACKUP_REMINDER_DAYS * 24 * 3600 * 1000;
}
