import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Story } from './db';

/**
 * Livre d'histoires (#68) : les histoires enregistrées restent sur le téléphone (IndexedDB),
 * ne vont ni dans la sauvegarde ni dans un jeu partagé, et partent avec « Effacer toutes les
 * données ». Chacune se réécoute et se supprime.
 */
export const MAX_STORIES = 30;
/** Durée maximale d'une histoire enregistrée, en secondes. */
export const MAX_STORY_SECONDS = 180;

/** Les histoires, la plus récente d'abord. */
export function listStories(): Promise<Story[]> {
  return db.stories.orderBy('createdAt').reverse().toArray();
}

export function useStories(): Story[] | undefined {
  return useLiveQuery(listStories, []);
}

export function useStoryCount(): number | undefined {
  return useLiveQuery(() => db.stories.count(), []);
}

/** Garde une histoire ; refusée (null) quand le livre est plein. */
export async function addStory(
  audio: Blob,
  parts: Story['parts'],
  now = Date.now(),
): Promise<number | null> {
  return db.transaction('rw', db.stories, async () => {
    if ((await db.stories.count()) >= MAX_STORIES) return null;
    return db.stories.add({ audio, parts, createdAt: now } as Story);
  });
}

export function deleteStory(id: number): Promise<void> {
  return db.stories.delete(id);
}
