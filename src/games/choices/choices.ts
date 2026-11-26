import type { Song } from '../chanson/songs';
import type { DeckItem, DeckKind } from '../deck/types';
import { glyphLabel, type GlyphCard, type GlyphSet } from '../lettres/bank';
import { orderByLevel, type Level } from '../levels';

/**
 * « Répondre en montrant » (#123) : la carte propose quelques choix en grand, l'enfant montre
 * ou touche la bonne réponse. Un autre choix ne déclenche rien : on peut réessayer.
 */

/** Un choix montré à l'enfant. */
export interface ChoiceOption {
  /** Clé unique parmi les choix (deux choix de même clé ne sont jamais montrés ensemble). */
  key: string;
  /** Nom du choix, annoncé par le lecteur d'écran et écrit sous un emoji. */
  label: string;
  level?: Level;
  /** Visuel, par ordre de préférence ; sans visuel, le texte de la réponse. */
  glyph?: string;
  /** Famille du glyphe (#48) : écriture attachée, dé, main… (majuscule par défaut). */
  glyphSet?: GlyphSet;
  color?: string;
  image?: Blob;
  emoji?: string;
}

/** Nombre de choix selon le niveau : Petits 2, Moyens 3, Grands 4. */
export const CHOICE_COUNTS: Record<Level, number> = { 1: 2, 2: 3, 3: 4 };
/** Sans niveau connu : 3 choix. */
export const DEFAULT_CHOICE_COUNT = 3;
export const MAX_CHOICES = 4;

export function choiceCount(level: Level | null | undefined): number {
  return level ? CHOICE_COUNTS[level] : DEFAULT_CHOICE_COUNT;
}

/**
 * Niveau qui règle le nombre de choix : celui de la partie, sinon le plus jeune des joueurs
 * du jour qui ont un niveau (le plus simple pour tous), sinon aucun.
 */
export function choiceLevel(
  gameLevel: Level | null | undefined,
  players: readonly { level?: Level }[],
): Level | null {
  if (gameLevel) return gameLevel;
  const levels = players.flatMap((p) => (p.level ? [p.level] : []));
  return levels.length ? (Math.min(...levels) as Level) : null;
}

/**
 * Choix voisins de la réponse, tirés du même jeu : sans doublon, ceux du même niveau d'abord.
 * Assez pour le plus grand nombre de choix ; le nombre montré est appliqué par `arrange`.
 */
export function drawDistractors(
  answer: ChoiceOption,
  pool: readonly ChoiceOption[],
  random?: () => number,
): ChoiceOption[] {
  const seen = new Set([answer.key]);
  const others = pool.filter((o) => !seen.has(o.key) && (seen.add(o.key), true));
  return orderByLevel(others, answer.level ?? null, (o) => o.level, random).slice(
    0,
    MAX_CHOICES - 1,
  );
}

/**
 * Les `count` choix montrés, la réponse à la place `slot` (entre 0 et 1) ; moins si le jeu a
 * trop peu de cartes, aucun s'il n'y a rien à choisir.
 */
export function arrange(
  answer: ChoiceOption,
  others: readonly ChoiceOption[],
  count: number,
  slot: number,
): ChoiceOption[] {
  const n = Math.min(count, others.length + 1, MAX_CHOICES);
  if (n < 2) return [];
  const shown = others.slice(0, n - 1);
  const at = Math.min(n - 1, Math.floor(slot * n));
  return [...shown.slice(0, at), answer, ...shown.slice(at)];
}

const keyOf = (text: string) => text.trim().toLocaleLowerCase('fr');

/** Choix d'une carte de jeu à cartes : photo, couleur, emoji, sinon le texte de la réponse. */
export function deckOption(item: DeckItem): ChoiceOption {
  return {
    key: keyOf(item.answer),
    label: item.answer,
    level: item.level,
    ...(item.image ? { image: item.image } : item.color ? { color: item.color } : {}),
    ...(item.emoji && !item.color && { emoji: item.emoji }),
  };
}

/** Choix d'un glyphe, annoncé « Lettre A », « Chiffre 3 », « 3 points »… */
export function glyphOption(card: GlyphCard): ChoiceOption {
  return {
    key: card.glyph,
    label: glyphLabel(card),
    level: card.level,
    glyph: card.glyph,
    glyphSet: card.set,
  };
}

/** Choix d'une chanson : son image (emoji) et son titre. */
export function songOption(song: Song): ChoiceOption {
  return {
    key: song.id,
    label: song.title,
    level: song.level,
    ...(song.emoji && { emoji: song.emoji }),
  };
}

/**
 * Cartes d'un jeu à cartes parmi lesquelles tirer les choix, ou rien si le jeu ne s'y prête
 * pas : un dessin, ou « Mime ça » (l'enfant mime, c'est le parent qui devine).
 */
export function deckChoicePool(deck: {
  id: string;
  kind: DeckKind;
  items: readonly DeckItem[];
}): readonly DeckItem[] | undefined {
  return deck.kind === 'draw' || deck.id === 'mime' ? undefined : deck.items;
}

/**
 * Jeux où l'enfant voit déjà la réponse (couleur, photo, lettre) : les choix remplacent
 * l'image et le parent demande « Montre-moi… ». Ailleurs (son, chanson, question), les choix
 * s'ajoutent sous la carte.
 */
export function showsAnswer(kind: DeckKind | 'glyph' | 'melody'): boolean {
  return kind === 'image' || kind === 'glyph';
}
