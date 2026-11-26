import { useEffect } from 'react';
import { db } from './db';

/**
 * Mémoire des cartes vues (#55) : pour chaque jeu, l'heure à laquelle chaque carte a été montrée
 * pour la dernière fois. Le tirage d'une partie sert d'abord les cartes jamais vues, puis les
 * plus anciennes : deux parties de suite n'ont aucune carte commune tant qu'il en reste de
 * nouvelles.
 *
 * Gardée dans la table des réglages (clé `seenCards`), donc effacée avec « Effacer toutes les
 * données » ; elle reste sur le téléphone (ni sauvegarde, ni jeu partagé). Lecture synchrone :
 * le tirage est fait au premier rendu du jeu.
 */
export const SEEN_KEY = 'seenCards';

/** Jeu → clé de la carte → dernière fois montrée (ms). */
export type SeenCards = Record<string, Record<string, number>>;

let memory: SeenCards = {};

function isStamps(value: unknown): value is Record<string, number> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every((t) => Number.isFinite(t))
  );
}

/** Reprend la mémoire lue dans la base (au démarrage, ou après une remise à zéro). */
export function restoreSeen(value: unknown) {
  const next: SeenCards = {};
  if (value && typeof value === 'object' && !Array.isArray(value))
    for (const [game, stamps] of Object.entries(value)) if (isStamps(stamps)) next[game] = stamps;
  memory = next;
}

/** Dernière fois qu'une carte a été montrée ; 0 : jamais. */
export function seenAt(gameId: string, key: string): number {
  return memory[gameId]?.[key] ?? 0;
}

/**
 * Pour le tirage : la dernière fois que chaque élément a été montré, d'après sa clé
 * (la même que celle du tirage sauvegardé, `useSavedDraw`).
 */
export function seenOf<T>(
  gameId: string,
  items: readonly T[],
  keyOf: (item: T, index: number) => string,
): (item: T) => number {
  const stamps = new Map<T, number>();
  items.forEach((item, i) => stamps.set(item, seenAt(gameId, keyOf(item, i))));
  return (item) => stamps.get(item) ?? 0;
}

/** Note une carte comme montrée maintenant. */
export function markSeen(gameId: string, key: string, now = Date.now()) {
  memory = { ...memory, [gameId]: { ...memory[gameId], [key]: now } };
  void db.settings.put({ key: SEEN_KEY, value: memory }).catch(() => {});
}

/** Note la carte affichée comme vue (rien tant qu'il n'y en a pas). */
export function useMarkSeen(gameId: string, key: string | undefined) {
  useEffect(() => {
    if (key !== undefined) markSeen(gameId, key);
  }, [gameId, key]);
}
