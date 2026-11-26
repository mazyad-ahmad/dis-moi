import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Drawing } from './db';
import { shareFile, type ShareResult } from './gameFile';
import { requestPersistentStorage } from './storage';

/**
 * Galerie des dessins gardés (#52). Les images restent sur le téléphone ; elles ne partent
 * que par le bouton « Partager » du parent, ou dans sa sauvegarde complète.
 */

/** Au-delà, « Garder » est refusé : la galerie propose de faire de la place. */
export const MAX_DRAWINGS = 200;
/** Nombre de dessins retirés par le nettoyage proposé (les plus anciens). */
export const CLEANUP_COUNT = 50;
/** À partir de ce nombre, la galerie propose le nettoyage. */
export const CLEANUP_FROM = MAX_DRAWINGS - CLEANUP_COUNT;

export class DrawingError extends Error {}

export const GALLERY_FULL = `La galerie est pleine (${MAX_DRAWINGS} dessins). Le parent peut faire de la place dans « Dessins gardés ».`;

export type NewDrawing = Pick<Drawing, 'word' | 'image' | 'playerIds'>;

/** Les plus récents d'abord. */
export function listDrawings(): Promise<Drawing[]> {
  return db.drawings.orderBy('createdAt').reverse().toArray();
}

export function useDrawings(): Drawing[] | undefined {
  return useLiveQuery(listDrawings, []);
}

/** Nombre de dessins gardés, sans lire les images. */
export function useDrawingCount(): number | undefined {
  return useLiveQuery(() => db.drawings.count(), []);
}

/** Garde un dessin ; refusé (DrawingError) quand la galerie est pleine. */
export async function keepDrawing(drawing: NewDrawing, now = Date.now()): Promise<number> {
  const id = await db.transaction('rw', db.drawings, async () => {
    if ((await db.drawings.count()) >= MAX_DRAWINGS) throw new DrawingError(GALLERY_FULL);
    return db.drawings.add({ ...drawing, createdAt: now } as Drawing);
  });
  void requestPersistentStorage();
  return id;
}

/** L'enfant a continué après « Garder » : le même dessin, avec sa nouvelle image. */
export async function updateDrawingImage(id: number, image: Blob): Promise<void> {
  await db.drawings.update(id, { image });
}

export function deleteDrawing(id: number): Promise<void> {
  return db.drawings.delete(id);
}

/** Nettoyage proposé : retire les `count` dessins les plus anciens. */
export async function deleteOldestDrawings(count = CLEANUP_COUNT): Promise<void> {
  await db.transaction('rw', db.drawings, async () => {
    const ids = await db.drawings.orderBy('createdAt').limit(count).primaryKeys();
    await db.drawings.bulkDelete(ids);
  });
}

/** Place prise par les images, en octets. */
export function drawingsSize(drawings: readonly Drawing[]): number {
  return drawings.reduce((n, d) => n + d.image.size, 0);
}

/** « dessin-un-chat-2026-11-26.png » : sans accent ni espace, pour toutes les applis. */
export function drawingFileName(drawing: Pick<Drawing, 'word' | 'createdAt'>): string {
  const slug = drawing.word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const d = new Date(drawing.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `dessin-${slug ? `${slug}-` : ''}${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.png`;
}

/** Partage Android de l'image (ou téléchargement), seulement sur le geste du parent. */
export function shareDrawing(drawing: Drawing): Promise<ShareResult> {
  const file = new File([drawing.image], drawingFileName(drawing), { type: 'image/png' });
  return shareFile(file, `Dessin : ${drawing.word}`);
}
