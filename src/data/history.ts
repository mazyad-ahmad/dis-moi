import { db, type GameRecord } from './db';

type NewRecord = Omit<GameRecord, 'id' | 'startedAt' | 'updatedAt' | 'playerIds'>;

/** Crée la partie à la première manche jouée, avec les joueurs présents. */
export async function startRecord(data: NewRecord): Promise<number> {
  const now = Date.now();
  const playerIds = (await db.players.toArray()).map((p) => p.id);
  return db.games.add({ ...data, startedAt: now, updatedAt: now, playerIds } as GameRecord);
}

export async function updateRecord(id: number, data: Pick<GameRecord, 'played' | 'stars'>) {
  await db.games.update(id, { ...data, updatedAt: Date.now() });
}

export async function listRecords(): Promise<GameRecord[]> {
  return db.games.orderBy('startedAt').reverse().toArray();
}
