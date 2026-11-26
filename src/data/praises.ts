import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Praise } from './db';

/** Félicitations enregistrées par le parent (#116) : quelques-unes suffisent. */
export const MAX_PRAISES = 5;

export function listPraises(): Promise<Praise[]> {
  return db.praises.orderBy('createdAt').toArray();
}

export function usePraises(): Praise[] | undefined {
  return useLiveQuery(listPraises, []);
}

/** Garde un enregistrement sur le téléphone ; refusé au-delà de MAX_PRAISES. */
export async function addPraise(audio: Blob, now = Date.now()): Promise<number | null> {
  return db.transaction('rw', db.praises, async () => {
    if ((await db.praises.count()) >= MAX_PRAISES) return null;
    return db.praises.add({ audio, createdAt: now } as Praise);
  });
}

export function deletePraise(id: number): Promise<void> {
  return db.praises.delete(id);
}
