import { isActivity, type Activity } from '../games/activities';
import { DECK_KINDS, type DeckItem, type DeckKind } from '../games/deck/types';
import { isLevel, type Level } from '../games/levels';
import { cleanGameName, cleanItem, CustomGameError, MAX_GAME_NAME, MAX_ITEMS } from './customGames';
import { db, type CustomGame } from './db';
import { requestPersistentStorage } from './storage';

/**
 * Fichier d'un jeu créé, pour le partager avec un autre téléphone (#10).
 * Un seul fichier JSON : les photos et les sons y sont rangés en base64.
 */
export const GAME_FILE_FORMAT = 'dis-moi/jeu';
export const GAME_FILE_VERSION = 1;
export const GAME_FILE_EXT = '.dismoi.json';
/** Taille maximale d'un fichier importé (50 cartes avec photo réduite et son de 10 s). */
export const MAX_GAME_FILE_SIZE = 30 * 1024 * 1024;

interface FileItem {
  answer: string;
  text?: string;
  hint?: string;
  hints?: string[];
  prolonger?: string;
  emoji?: string;
  color?: string;
  image?: string;
  audio?: string;
}

export interface GameFile {
  format: typeof GAME_FILE_FORMAT;
  version: number;
  name: string;
  kind: DeckKind;
  /** Type et âge choisis à la création (#137), facultatifs : un fichier plus ancien n'en a pas. */
  activity?: Activity;
  level?: Level;
  items: FileItem[];
}

/** Ce qu'un fichier de jeu (ou une sauvegarde) garde d'un jeu créé. */
export type SharedGame = Pick<CustomGame, 'name' | 'kind' | 'items' | 'activity' | 'level'>;

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK)
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}

/** Relit un média du fichier ; refuse tout ce qui n'est pas une image ou un son. */
function dataUrlToBlob(value: unknown, family: 'image' | 'audio'): Blob | undefined {
  if (value === undefined) return undefined;
  // Le type peut porter des paramètres : « audio/webm;codecs=opus » des enregistrements Android.
  const match =
    typeof value === 'string' &&
    /^data:([\w.+-]+\/[\w.+-]+(?:;[\w.+-]+=[\w.+-]+)*);base64,(.*)$/s.exec(value);
  if (!match || !match[1].startsWith(`${family}/`)) throw new CustomGameError(INVALID);
  let binary: string;
  try {
    binary = atob(match[2]);
  } catch {
    throw new CustomGameError(INVALID);
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: match[1] });
}

const INVALID = 'Ce fichier n’est pas un jeu Dis-moi.';

function optionalText(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new CustomGameError(INVALID);
  return value;
}

function optionalTextList(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string'))
    throw new CustomGameError(INVALID);
  return value as string[];
}

/** Jeu mis en forme pour un fichier (aussi repris tel quel dans une sauvegarde complète). */
export async function encodeGame(game: SharedGame): Promise<GameFile> {
  const items: FileItem[] = [];
  for (const it of game.items) {
    const item: FileItem = { answer: it.answer };
    if (it.text) item.text = it.text;
    if (it.hint) item.hint = it.hint;
    if (it.hints?.length) item.hints = it.hints;
    if (it.prolonger) item.prolonger = it.prolonger;
    if (it.emoji) item.emoji = it.emoji;
    if (it.color) item.color = it.color;
    if (it.image) item.image = await blobToDataUrl(it.image);
    if (it.audio) item.audio = await blobToDataUrl(it.audio);
    items.push(item);
  }
  return {
    format: GAME_FILE_FORMAT,
    version: GAME_FILE_VERSION,
    name: game.name,
    kind: game.kind,
    ...(game.activity && { activity: game.activity }),
    ...(game.level && { level: game.level }),
    items,
  };
}

/** Contenu du fichier d'un jeu, prêt à être enregistré ou partagé. */
export async function gameToFile(game: CustomGame): Promise<File> {
  const content = await encodeGame(game);
  return new File([JSON.stringify(content)], gameFileName(game.name), {
    type: 'application/json',
  });
}

/** « Devinettes de Léa » → « devinettes-de-lea.dismoi.json ». */
export function gameFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'jeu'}${GAME_FILE_EXT}`;
}

/** Lit et vérifie un fichier de jeu. Lève une CustomGameError au message lisible. */
export function parseGameFile(text: string): SharedGame {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new CustomGameError(INVALID);
  }
  return decodeGame(data);
}

/** Vérifie un jeu déjà lu (fichier de jeu ou entrée d'une sauvegarde). */
export function decodeGame(data: unknown): SharedGame {
  if (typeof data !== 'object' || data === null) throw new CustomGameError(INVALID);
  const raw = data as Record<string, unknown>;
  if (raw.format !== GAME_FILE_FORMAT) throw new CustomGameError(INVALID);
  if (typeof raw.version !== 'number' || raw.version > GAME_FILE_VERSION)
    throw new CustomGameError(
      'Ce jeu vient d’une version plus récente de Dis-moi. Mets l’appli à jour.',
    );
  const kind = raw.kind as DeckKind;
  if (!DECK_KINDS.some((k) => k.value === kind)) throw new CustomGameError(INVALID);
  if (typeof raw.name !== 'string' || !Array.isArray(raw.items)) throw new CustomGameError(INVALID);
  if (raw.items.length > MAX_ITEMS) throw new CustomGameError(`${MAX_ITEMS} cartes maximum.`);

  const items: DeckItem[] = raw.items.map((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) throw new CustomGameError(INVALID);
    const e = entry as Record<string, unknown>;
    if (typeof e.answer !== 'string') throw new CustomGameError(INVALID);
    return cleanItem(kind, {
      answer: e.answer,
      text: optionalText(e.text),
      hint: optionalText(e.hint),
      hints: optionalTextList(e.hints),
      prolonger: optionalText(e.prolonger),
      emoji: optionalText(e.emoji),
      color: optionalText(e.color),
      image: kind === 'image' ? dataUrlToBlob(e.image, 'image') : undefined,
      audio: kind === 'sound' ? dataUrlToBlob(e.audio, 'audio') : undefined,
    });
  });
  return {
    name: cleanGameName(raw.name),
    kind,
    items,
    // Type et âge (#137) : facultatifs, ignorés s'ils sont inconnus.
    ...(isActivity(raw.activity) && { activity: raw.activity }),
    ...(isLevel(raw.level) && { level: raw.level }),
  };
}

/** « Devinettes » déjà pris → « Devinettes (2) », sans dépasser la longueur maximale. */
export function uniqueGameName(wanted: string, taken: Set<string>): string {
  let name = wanted;
  for (let n = 2; taken.has(name); n++) {
    const suffix = ` (${n})`;
    name = `${wanted.slice(0, MAX_GAME_NAME - suffix.length).trimEnd()}${suffix}`;
  }
  return name;
}

/** Importe un fichier de jeu comme un nouveau jeu créé ; renvoie son identifiant. */
export async function importGameFile(file: Blob): Promise<number> {
  if (file.size > MAX_GAME_FILE_SIZE) throw new CustomGameError('Ce fichier est trop gros.');
  const game = parseGameFile(await file.text());
  const names = new Set((await db.customGames.toArray()).map((g) => g.name));
  const name = uniqueGameName(game.name, names);
  const now = Date.now();
  void requestPersistentStorage();
  return db.customGames.add({ ...game, name, createdAt: now, updatedAt: now } as CustomGame);
}

/**
 * Envoie le fichier : partage Android (WhatsApp, e-mail, Drive…) quand le navigateur le permet,
 * sinon téléchargement dans le téléphone.
 */
export async function shareGame(game: CustomGame): Promise<ShareResult> {
  return shareFile(await gameToFile(game), game.name);
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

/** Partage Android si possible, sinon téléchargement. */
export async function shareFile(file: File, title: string): Promise<ShareResult> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Partage refusé par le navigateur : on retombe sur le téléchargement.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
