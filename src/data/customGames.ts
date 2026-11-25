import { useLiveQuery } from 'dexie-react-hooks';
import type { Deck, DeckItem, DeckKind } from '../games/deck/types';
import { db, type CustomGame } from './db';
import { requestPersistentStorage } from './storage';

export const MAX_GAME_NAME = 30;
export const MAX_ITEMS = 50;
export const MAX_TEXT = 140;
/** Préfixe des identifiants de route des jeux créés : #/jeu/perso-12. */
export const CUSTOM_PREFIX = 'perso-';

export class CustomGameError extends Error {}

function clean(raw: string | undefined, max: number): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function cleanGameName(raw: string): string {
  const name = clean(raw, MAX_GAME_NAME);
  if (!name) throw new CustomGameError('Donne un nom au jeu.');
  return name;
}

/** Vérifie une carte selon le type de jeu et retire les champs vides. */
export function cleanItem(kind: DeckKind, raw: DeckItem): DeckItem {
  const item: DeckItem = { answer: clean(raw.answer, MAX_TEXT) };
  const text = clean(raw.text, MAX_TEXT);
  const hint = clean(raw.hint, MAX_TEXT);
  if (text && kind !== 'draw') item.text = text;
  if (hint && kind !== 'draw') item.hint = hint;
  if (raw.image && kind === 'image') item.image = raw.image;
  if (raw.audio && kind === 'sound') item.audio = raw.audio;

  if (!item.answer)
    throw new CustomGameError(kind === 'draw' ? 'Écris le mot à dessiner.' : 'Écris la réponse.');
  if (kind === 'question' && !item.text) throw new CustomGameError('Écris la question.');
  if (kind === 'image' && !item.image && !item.text)
    throw new CustomGameError('Ajoute une photo ou un texte à montrer.');
  if (kind === 'sound' && !item.audio && !item.text)
    throw new CustomGameError('Enregistre un son ou écris le bruit à imiter.');
  return item;
}

export async function createCustomGame(rawName: string, kind: DeckKind): Promise<number> {
  const name = cleanGameName(rawName);
  const now = Date.now();
  const items: DeckItem[] = [];
  void requestPersistentStorage();
  return db.customGames.add({ name, kind, items, createdAt: now, updatedAt: now } as CustomGame);
}

async function mutate(id: number, change: (g: CustomGame) => Partial<CustomGame>) {
  await db.transaction('rw', db.customGames, async () => {
    const game = await db.customGames.get(id);
    if (!game) throw new CustomGameError('Ce jeu n’existe plus.');
    await db.customGames.update(id, { ...change(game), updatedAt: Date.now() });
  });
}

export function renameCustomGame(id: number, rawName: string) {
  const name = cleanGameName(rawName);
  return mutate(id, () => ({ name }));
}

export function addItem(id: number, raw: DeckItem) {
  return mutate(id, (g) => {
    if (g.items.length >= MAX_ITEMS) throw new CustomGameError(`${MAX_ITEMS} cartes maximum.`);
    return { items: [...g.items, cleanItem(g.kind, raw)] };
  });
}

export function updateItem(id: number, index: number, raw: DeckItem) {
  return mutate(id, (g) => ({
    items: g.items.map((it, i) => (i === index ? cleanItem(g.kind, raw) : it)),
  }));
}

export function removeItem(id: number, index: number) {
  return mutate(id, (g) => ({ items: g.items.filter((_, i) => i !== index) }));
}

export async function deleteCustomGame(id: number): Promise<void> {
  await db.customGames.delete(id);
}

export function listCustomGames(): Promise<CustomGame[]> {
  return db.customGames.orderBy('createdAt').toArray();
}

/** `undefined` tant que la base n'a pas répondu. */
export function useCustomGames(): CustomGame[] | undefined {
  return useLiveQuery(listCustomGames, []);
}

/** `undefined` pendant le chargement, `null` si le jeu n'existe pas. */
export function useCustomGame(id: number): CustomGame | null | undefined {
  return useLiveQuery(async () => (await db.customGames.get(id)) ?? null, [id]);
}

export function customRouteId(id: number): string {
  return `${CUSTOM_PREFIX}${id}`;
}

export function parseCustomRouteId(routeId: string): number | undefined {
  if (!routeId.startsWith(CUSTOM_PREFIX)) return undefined;
  const n = Number(routeId.slice(CUSTOM_PREFIX.length));
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

const TINTS = ['sky', 'dawn', 'meadow'] as const;

export function customDeck(game: CustomGame): Deck {
  return {
    id: customRouteId(game.id),
    name: game.name,
    category: 'Mon jeu',
    kind: game.kind,
    tint: TINTS[game.id % TINTS.length],
    mark: game.name.charAt(0).toLocaleUpperCase('fr'),
    items: game.items,
  };
}
