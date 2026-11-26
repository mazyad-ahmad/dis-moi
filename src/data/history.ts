import { useLiveQuery } from 'dexie-react-hooks';
import { db, type GameRecord } from './db';
import { requestPersistentStorage } from './storage';

type NewRecord = Omit<GameRecord, 'id' | 'startedAt' | 'updatedAt' | 'playerIds'>;

/** Crée la partie à la première manche jouée, avec les joueurs présents. */
export async function startRecord(data: NewRecord): Promise<number> {
  const now = Date.now();
  const playerIds = (await db.players.toArray()).map((p) => p.id);
  // Première partie : l'appli a désormais quelque chose à garder.
  void requestPersistentStorage();
  return db.games.add({ ...data, startedAt: now, updatedAt: now, playerIds } as GameRecord);
}

export async function updateRecord(id: number, data: Pick<GameRecord, 'played' | 'stars'>) {
  await db.games.update(id, { ...data, updatedAt: Date.now() });
}

export async function listRecords(): Promise<GameRecord[]> {
  return db.games.orderBy('startedAt').reverse().toArray();
}

/** `undefined` tant que la base n'a pas répondu ; la plus récente en premier. */
export function useRecords(): GameRecord[] | undefined {
  return useLiveQuery(listRecords, []);
}

/**
 * Remise à zéro des étoiles : efface l'historique des parties.
 * Suppression partie par partie, dans une transaction, plutôt que `clear()` (effacement « de
 * plage », traité à part par le cache des requêtes en direct) : chaque requête en direct
 * (onglet Étoiles, accueil) apprend quelles parties sont effacées et relit la base (#143).
 */
export async function clearRecords(): Promise<void> {
  await db.transaction('rw', db.games, async () => {
    await db.games.bulkDelete(await db.games.toCollection().primaryKeys());
  });
}

export function totalStars(records: GameRecord[]): number {
  return records.reduce((sum, r) => sum + r.stars, 0);
}

/** Petites récompenses débloquées par le total d'étoiles gagnées ensemble. */
export const REWARDS = [
  { stars: 1, emoji: '🌱', label: 'Première étoile' },
  { stars: 10, emoji: '🌼', label: '10 étoiles' },
  { stars: 25, emoji: '🌳', label: '25 étoiles' },
  { stars: 50, emoji: '🌈', label: '50 étoiles' },
  { stars: 100, emoji: '🚀', label: '100 étoiles' },
  { stars: 250, emoji: '🌟', label: '250 étoiles' },
] as const;
