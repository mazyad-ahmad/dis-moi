import { MAX_GAME_NAME, MAX_HINTS, MAX_TEXT } from '../data/customGames';
import { GAME_FILE_FORMAT, GAME_FILE_VERSION } from '../data/gameFile';
import { parseMelody } from '../games/chanson/melody';
import { isActivity, type Activity } from '../games/activities';
import { DECK_KINDS, type DeckItem, type DeckKind } from '../games/deck/types';
import { isLevel, LEVELS, type Level } from '../games/levels';
import { storyPart, STORY_PARTS } from '../games/histoire/parts';
import { chatTheme, CHAT_THEMES } from '../games/raconte/themes';
import type { Tint } from '../games/registry';

/**
 * Packs de contenu des jeux intégrés (#28) : un fichier JSON par pack dans `src/content/`,
 * au format des fichiers de jeu `.dismoi.json` (format, version, nom, type, cartes) avec
 * quelques champs en plus. Ajouter une carte = ajouter une ligne au fichier. Voir docs/PACKS.md.
 */

/**
 * Types de pack : ceux des jeux à cartes, plus les airs (Quelle chanson ?), les glyphes et les
 * questions ouvertes, sans bonne réponse (Raconte-moi, #125), et les éléments d'histoire
 * (Histoire à inventer, #68).
 */
export type PackKind = DeckKind | 'melody' | 'glyph' | 'chat' | 'story';
export const PACK_KINDS: PackKind[] = [
  ...DECK_KINDS.map((k) => k.value),
  'melody',
  'glyph',
  'chat',
  'story',
];

export interface PackItem extends Omit<DeckItem, 'image' | 'audio' | 'shadow'> {
  /** Identifiant stable dans le pack (minuscules, chiffres et tirets). */
  id: string;
  /** Niveau par âge, obligatoire pour le contenu intégré (#40). */
  level: Level;
  /** Air noté (pack « melody ») : voir games/chanson/melody.ts. */
  melody?: string;
  /** Tempo de l'air, en battements par minute (pack « melody »). */
  bpm?: number;
}

export interface Pack {
  format: typeof GAME_FILE_FORMAT;
  version: number;
  /** Identifiant du pack (pour le catalogue : celui du jeu, #/jeu/<id>). */
  id: string;
  /** Révision du contenu, augmentée à chaque changement de cartes. */
  revision: number;
  kind: PackKind;
  name: string;
  lang: string;
  /** Champs d'affichage des jeux du catalogue. */
  category?: string;
  desc?: string;
  mark?: string;
  tint?: Tint;
  /** Le jeu fait bouger l'enfant (mime…) : pas proposé en mode Coucher (#42). */
  moves?: boolean;
  /** Le jeu qui fait bouger a une version sans bouger, jouée au Coucher et en Voiture. */
  still?: boolean;
  /** Ombres (#61) : les images (emoji) sont montrées en silhouette, révélées avec la réponse. */
  shadow?: boolean;
  /** Jeux du catalogue (#137) : types du jeu (le premier le range) et ce qu'il fait travailler. */
  activities?: Activity[];
  skill?: string;
  items: PackItem[];
}

export class PackError extends Error {}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COLOR = /^#[0-9a-f]{6}$/;
const TINTS: Tint[] = ['meadow', 'sky', 'dawn'];
const PACK_FIELDS = new Set([
  'format',
  'version',
  'id',
  'revision',
  'kind',
  'name',
  'lang',
  'category',
  'desc',
  'mark',
  'tint',
  'moves',
  'still',
  'shadow',
  'activities',
  'skill',
  'items',
]);
const ITEM_FIELDS = new Set([
  'id',
  'answer',
  'text',
  'hint',
  'hints',
  'talk',
  'emoji',
  'color',
  'level',
  'tags',
  'lang',
  'melody',
  'bpm',
  'others',
]);

/** L'intrus (#63) : trois images qui vont ensemble, plus l'intrus. */
export const INTRUS_OTHERS = 3;

const isText = (v: unknown, max = MAX_TEXT): v is string =>
  typeof v === 'string' && v.trim() === v && v.length > 0 && v.length <= max;

/** Règles propres à chaque type de pack. Renvoie le problème, ou rien. */
function kindRule(kind: PackKind, item: Record<string, unknown>): string | undefined {
  switch (kind) {
    case 'sound':
      return isText(item.text) ? undefined : 'bruit à imiter (« text ») manquant';
    case 'question':
      return isText(item.text) ? undefined : 'question (« text ») manquante';
    case 'image':
      if (item.color !== undefined && !(typeof item.color === 'string' && COLOR.test(item.color)))
        return 'couleur invalide (attendu : #rrggbb en minuscules)';
      return item.emoji || item.color || item.text
        ? undefined
        : 'rien à montrer (« emoji », « color » ou « text »)';
    case 'draw':
      return undefined;
    case 'chat':
      // La question est dans « answer » ; chaque question a un thème.
      return chatTheme(item.tags as string[] | undefined)
        ? undefined
        : `thème (« tags ») manquant : ${CHAT_THEMES.map((t) => t.value).join(', ')}`;
    case 'story':
      // Un héros, un lieu ou un objet (dans « answer »), avec son image.
      if (!item.emoji) return 'image (« emoji ») manquante';
      return storyPart(item.tags as string[] | undefined)
        ? undefined
        : `rôle (« tags ») : un seul parmi ${STORY_PARTS.map((p) => p.value).join(', ')}`;
    case 'glyph':
      if (typeof item.answer !== 'string' || [...item.answer].length !== 1)
        return 'un glyphe est un seul caractère';
      return isText(item.hint) ? undefined : 'consigne (« hint ») manquante';
    case 'melody': {
      if (!isText(item.hint)) return 'indice (« hint ») manquant';
      if (typeof item.bpm !== 'number' || item.bpm < 40 || item.bpm > 240)
        return 'tempo (« bpm ») entre 40 et 240 attendu';
      if (typeof item.melody !== 'string') return 'air (« melody ») manquant';
      try {
        parseMelody(item.melody);
      } catch (e) {
        return `air illisible : ${(e as Error).message}`;
      }
      return undefined;
    }
  }
}

/** Problème d'une carte, ou rien. */
function itemProblem(kind: PackKind, item: Record<string, unknown>): string | undefined {
  const unknown = Object.keys(item).filter((k) => !ITEM_FIELDS.has(k));
  if (unknown.length) return `champ inconnu « ${unknown[0]} »`;
  if (typeof item.id !== 'string' || !ID.test(item.id))
    return 'identifiant (« id ») manquant ou invalide (minuscules, chiffres, tirets)';
  if (!isText(item.answer)) return 'réponse (« answer ») vide, trop longue ou mal espacée';
  for (const field of ['text', 'hint', 'talk'] as const)
    if (item[field] !== undefined && !isText(item[field]))
      return `« ${field} » vide, trop long (${MAX_TEXT} max) ou mal espacé`;
  if (
    item.hints !== undefined &&
    !(
      Array.isArray(item.hints) &&
      item.hints.length > 0 &&
      item.hints.length <= MAX_HINTS &&
      item.hints.every((h) => isText(h))
    )
  )
    return `indices (« hints ») : liste de 1 à ${MAX_HINTS} textes attendue`;
  if (item.emoji !== undefined && !isText(item.emoji, 16)) return 'emoji invalide';
  // Niveaux par âge (#40) : chaque carte intégrée en a un.
  if (!isLevel(item.level))
    return `niveau (« level ») manquant : ${LEVELS.map((l) => `${l.value} (${l.name}, ${l.ages})`).join(', ')}`;
  if (
    item.tags !== undefined &&
    !(Array.isArray(item.tags) && item.tags.every((t) => typeof t === 'string' && ID.test(t)))
  )
    return 'thèmes (« tags ») : liste de mots en minuscules attendue';
  if (item.lang !== undefined && !(typeof item.lang === 'string' && /^[a-z]{2}$/.test(item.lang)))
    return 'langue (« lang ») : code à deux lettres attendu';
  if (kind !== 'melody' && (item.melody !== undefined || item.bpm !== undefined))
    return '« melody » et « bpm » sont réservés aux packs d’airs';
  if (item.others !== undefined) {
    // L'intrus (#63) : trois images qui vont ensemble, l'intrus est l'« emoji ».
    const others = item.others;
    if (kind !== 'image') return '« others » est réservé aux packs d’images';
    if (!(
      Array.isArray(others) &&
      others.length === INTRUS_OTHERS &&
      others.every((e) => isText(e, 16)) &&
      new Set(others).size === INTRUS_OTHERS
    ))
      return `« others » : ${INTRUS_OTHERS} emoji différents attendus`;
    if (!item.emoji || (others as string[]).includes(item.emoji as string))
      return 'intrus (« emoji ») manquant ou parmi les « others »';
  }
  return kindRule(kind, item);
}

/**
 * Vérifie un pack. Lève une PackError qui nomme le fichier et la carte fautive :
 * « Pack chansons.json, carte 3 (« Au clair de la lune ») : tempo (« bpm ») entre 40 et 240 attendu ».
 */
export function validatePack(raw: unknown, file: string): Pack {
  const fail = (message: string): never => {
    throw new PackError(`Pack ${file} : ${message}`);
  };
  if (typeof raw !== 'object' || raw === null) fail('ce n’est pas un objet JSON');
  const pack = raw as Record<string, unknown>;
  const unknown = Object.keys(pack).filter((k) => !PACK_FIELDS.has(k));
  if (unknown.length) fail(`champ inconnu « ${unknown[0]} »`);
  if (pack.format !== GAME_FILE_FORMAT) fail(`« format » doit valoir « ${GAME_FILE_FORMAT} »`);
  if (pack.version !== GAME_FILE_VERSION) fail(`« version » doit valoir ${GAME_FILE_VERSION}`);
  if (typeof pack.id !== 'string' || !ID.test(pack.id)) fail('identifiant (« id ») invalide');
  if (!(Number.isInteger(pack.revision) && (pack.revision as number) >= 1))
    fail('« revision » : entier à partir de 1 attendu');
  if (!PACK_KINDS.includes(pack.kind as PackKind)) fail(`type (« kind ») inconnu : ${pack.kind}`);
  if (!isText(pack.name, MAX_GAME_NAME)) fail(`nom vide ou trop long (${MAX_GAME_NAME} max)`);
  if (pack.lang !== 'fr') fail('langue (« lang ») : seul « fr » existe pour l’instant');
  if (pack.tint !== undefined && !TINTS.includes(pack.tint as Tint)) fail('teinte inconnue');
  if (pack.moves !== undefined && typeof pack.moves !== 'boolean')
    fail('« moves » : true ou false attendu');
  if (pack.still !== undefined && !(pack.still === true && pack.moves === true))
    fail('« still » : true, seulement pour un jeu qui fait bouger (« moves »)');
  if (pack.shadow !== undefined && !(pack.shadow === true && pack.kind === 'image'))
    fail('« shadow » : true, seulement pour un jeu d’images (« image »)');
  if (
    pack.activities !== undefined &&
    !(
      Array.isArray(pack.activities) &&
      pack.activities.length > 0 &&
      pack.activities.every(isActivity) &&
      new Set(pack.activities).size === pack.activities.length
    )
  )
    fail('« activities » : liste de types connus, sans doublon, attendue');
  for (const field of ['category', 'desc', 'mark', 'skill'] as const)
    if (pack[field] !== undefined && !isText(pack[field])) fail(`« ${field} » vide ou trop long`);
  if (!Array.isArray(pack.items) || pack.items.length === 0) fail('aucune carte');

  const kind = pack.kind as PackKind;
  const ids = new Set<string>();
  const answers = new Set<string>();
  (pack.items as unknown[]).forEach((entry, i) => {
    const item = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<
      string,
      unknown
    >;
    const name = typeof item.answer === 'string' && item.answer ? ` (« ${item.answer} »)` : '';
    const where = `carte ${i + 1}${name}`;
    const problem = itemProblem(kind, item);
    if (problem) fail(`${where} : ${problem}`);
    if (ids.has(item.id as string)) fail(`${where} : identifiant « ${item.id} » en double`);
    if (answers.has(item.answer as string)) fail(`${where} : réponse en double`);
    ids.add(item.id as string);
    answers.add(item.answer as string);
  });
  return pack as unknown as Pack;
}

/** Tous les packs de `src/content/`, embarqués dans l'appli (hors ligne). */
export const PACK_FILES = import.meta.glob<unknown>('./*.json', {
  eager: true,
  import: 'default',
});

const PACKS = new Map(
  Object.values(PACK_FILES).map((raw) => [(raw as Pack).id, raw as Pack] as const),
);

/** Pack par identifiant (les packs sont vérifiés par les tests, pas au démarrage). */
export function getPack(id: string): Pack {
  const pack = PACKS.get(id);
  if (!pack) throw new PackError(`Pack introuvable : ${id}`);
  return pack;
}

/** Cartes d'un pack, au format des jeux à cartes. */
export function deckItems(pack: Pack): DeckItem[] {
  return pack.items.map((item) => {
    const copy: DeckItem & Partial<Pick<PackItem, 'melody' | 'bpm'>> = { ...item };
    delete copy.melody;
    delete copy.bpm;
    if (pack.shadow) copy.shadow = true;
    return copy;
  });
}
