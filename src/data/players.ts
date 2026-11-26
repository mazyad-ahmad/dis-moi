import type { Level } from '../games/levels';
import {
  db,
  PLAYER_ANIMALS,
  PLAYER_COLORS,
  type Player,
  type PlayerAnimal,
  type PlayerColor,
} from './db';
import { getSettings, setSetting, useSettings } from './settings';
import { useLiveRead } from './live';

export const MAX_PLAYERS = 6;
export const MAX_NAME_LENGTH = 20;

export class PlayerError extends Error {}

export function cleanName(raw: string): string {
  const name = raw.replace(/\s+/g, ' ').trim();
  if (!name) throw new PlayerError('Le prénom est vide.');
  if (name.length > MAX_NAME_LENGTH)
    throw new PlayerError(`Le prénom fait plus de ${MAX_NAME_LENGTH} caractères.`);
  return name;
}

export type Avatar = Pick<Player, 'animal' | 'color'>;

export const isAnimal = (v: unknown): v is PlayerAnimal => PLAYER_ANIMALS.some((a) => a.id === v);
export const isPlayerColor = (v: unknown): v is PlayerColor =>
  PLAYER_COLORS.includes(v as PlayerColor);

/** Nom des couleurs, pour le choix au lecteur d'écran. */
export const COLOR_NAMES: Record<PlayerColor, string> = {
  meadow: 'vert',
  sky: 'bleu',
  dawn: 'orange',
  rose: 'rose',
  lilac: 'violet',
  ember: 'rouge',
};

export function animalEmoji(animal: PlayerAnimal): string {
  return (PLAYER_ANIMALS.find((a) => a.id === animal) ?? PLAYER_ANIMALS[0]).emoji;
}

/** Nom accessible de l'avatar : « Léa, renard ». */
export function avatarLabel(player: Pick<Player, 'name' | 'animal'>): string {
  return `${player.name}, ${player.animal}`;
}

/** Premier animal et première couleur que personne n'a encore. */
export function freeAvatar(players: Avatar[]): Avatar {
  const animal =
    PLAYER_ANIMALS.find((a) => !players.some((p) => p.animal === a.id))?.id ??
    PLAYER_ANIMALS[players.length % PLAYER_ANIMALS.length].id;
  const color =
    PLAYER_COLORS.find((c) => !players.some((p) => p.color === c)) ??
    PLAYER_COLORS[players.length % PLAYER_COLORS.length];
  return { animal, color };
}

export async function listPlayers(): Promise<Player[]> {
  return db.players.orderBy('createdAt').toArray();
}

/** Sans avatar choisi, le joueur reçoit un animal et une couleur libres. */
export async function addPlayer(rawName: string, avatar?: Avatar): Promise<number> {
  const name = cleanName(rawName);
  return db.transaction('rw', db.players, async () => {
    const players = await listPlayers();
    if (players.length >= MAX_PLAYERS) throw new PlayerError(`${MAX_PLAYERS} joueurs maximum.`);
    if (players.some((p) => p.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr')))
      throw new PlayerError(`${name} est déjà dans la liste.`);
    const { animal, color } = avatar ?? freeAvatar(players);
    return db.players.add({ name, animal, color, createdAt: Date.now() } as Player);
  });
}

export async function renamePlayer(id: number, rawName: string): Promise<void> {
  const name = cleanName(rawName);
  await db.transaction('rw', db.players, async () => {
    const players = await listPlayers();
    if (
      players.some(
        (p) => p.id !== id && p.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'),
      )
    )
      throw new PlayerError(`${name} est déjà dans la liste.`);
    await db.players.update(id, { name });
  });
}

export async function removePlayer(id: number): Promise<void> {
  await db.players.delete(id);
  const { absentPlayers } = getSettings();
  if (absentPlayers.includes(id))
    await setSetting(
      'absentPlayers',
      absentPlayers.filter((a) => a !== id),
    );
}

export async function setPlayerAvatar(id: number, avatar: Partial<Avatar>): Promise<void> {
  await db.players.update(id, avatar);
}

/** Niveau par âge du joueur (#40) ; `null` le retire. */
export async function setPlayerLevel(id: number, level: Level | null): Promise<void> {
  await db.players.update(id, { level: level ?? undefined });
}

/** `undefined` tant que la base n'a pas répondu. */
export function usePlayers(): Player[] | undefined {
  return useLiveRead(listPlayers, []);
}

/* ---------- Joueurs actifs (#37) ----------
 * Sur l'accueil, le parent choisit qui joue aujourd'hui. La sélection est gardée dans les
 * réglages (liste des absents) d'une partie à l'autre ; seuls les joueurs actifs sont
 * enregistrés avec la partie. */

/** Joueurs actifs, dans l'ordre de la liste. */
export function activePlayers(players: Player[], absent: readonly number[]): Player[] {
  return players.filter((p) => !absent.includes(p.id));
}

/** Joueurs qui jouent aujourd'hui (tous, si personne n'a été désactivé). */
export async function listActivePlayers(): Promise<Player[]> {
  return activePlayers(await listPlayers(), getSettings().absentPlayers);
}

/** Active ou désactive un joueur pour les prochaines parties. */
export async function setPlayerActive(id: number, active: boolean): Promise<void> {
  const absent = getSettings().absentPlayers.filter((a) => a !== id);
  await setSetting('absentPlayers', active ? absent : [...absent, id]);
}

/** Joueurs actifs ; `undefined` tant que la base n'a pas répondu. */
export function useActivePlayers(): Player[] | undefined {
  const players = usePlayers();
  const { absentPlayers } = useSettings();
  return players && activePlayers(players, absentPlayers);
}
