import type { DeckItem } from '../deck/types';
import type { Level } from '../levels';
import { shuffle } from '../shuffle';

/**
 * Remets dans l'ordre (#131) : 3 à 5 images mélangées, l'enfant dit dans quel ordre elles vont
 * (ou le parent les déplace sous sa dictée). Cartes dans `src/content/catalogue-ordre.json` :
 * `answer` le nom de la séquence, `text` la question lue par le parent, `steps` les étapes dans
 * l'ordre attendu (texte et emoji facultatif), `hint` un coup de pouce.
 */
export const ORDRE_ID = 'ordre';

/** Nombre d'étapes selon le niveau de la carte : Petits 3, Moyens 4, Grands 5. */
export const STEPS_BY_LEVEL: Record<Level, number> = { 1: 3, 2: 4, 3: 5 };

/** Question lue quand la carte n'en a pas. */
export const ORDRE_QUESTION = 'Remets les images dans l’ordre !';

/**
 * Ordre de départ : les numéros des étapes mélangés, jamais déjà dans le bon ordre
 * (sauf s'il n'y a qu'une étape).
 */
export function mixedOrder(count: number, random: () => number = Math.random): number[] {
  const right = Array.from({ length: count }, (_, i) => i);
  if (count < 2) return right;
  for (let tries = 0; tries < 5; tries++) {
    const out = shuffle(right, random);
    if (!isInOrder(out)) return out;
  }
  // Hasard figé (tests) : on décale d'une case.
  return [...right.slice(1), right[0]];
}

/** Les étapes sont-elles dans l'ordre attendu ? */
export function isInOrder(order: readonly number[]): boolean {
  return order.every((step, i) => step === i);
}

/** Déplace l'élément de la place `from` à la place `to` (les autres glissent). */
export function moveTo<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= list.length) return [...list];
  const out = [...list];
  const [moved] = out.splice(from, 1);
  out.splice(to, 0, moved);
  return out;
}

/** Étapes d'une carte (aucune pour une carte d'un autre jeu). */
export function stepsOf(item: DeckItem): NonNullable<DeckItem['steps']> {
  return item.steps ?? [];
}
