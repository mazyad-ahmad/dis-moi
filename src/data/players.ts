import { useLiveQuery } from 'dexie-react-hooks';
import { db, PLAYER_COLORS, type Player, type PlayerColor } from './db';

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

export async function listPlayers(): Promise<Player[]> {
  return db.players.orderBy('createdAt').toArray();
}

export async function addPlayer(rawName: string): Promise<number> {
  const name = cleanName(rawName);
  return db.transaction('rw', db.players, async () => {
    const players = await listPlayers();
    if (players.length >= MAX_PLAYERS) throw new PlayerError(`${MAX_PLAYERS} joueurs maximum.`);
    if (players.some((p) => p.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr')))
      throw new PlayerError(`${name} est déjà dans la liste.`);
    const color: PlayerColor = PLAYER_COLORS[players.length % PLAYER_COLORS.length];
    return db.players.add({ name, color, createdAt: Date.now() } as Player);
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
}

export async function setPlayerColor(id: number, color: PlayerColor): Promise<void> {
  await db.players.update(id, { color });
}

/** `undefined` tant que la base n'a pas répondu. */
export function usePlayers(): Player[] | undefined {
  return useLiveQuery(listPlayers, []);
}
