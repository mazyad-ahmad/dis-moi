import { useSyncExternalStore } from 'react';
import { parseHash, type Route } from '../app/router';

/**
 * Verrou parent (#27) : quand il est activé, une petite opération est demandée avant
 * l'espace Parent, la gestion des joueurs et des jeux. Le déverrouillage vaut quelques
 * minutes, prolongées à chaque ouverture d'un écran parent. L'échéance n'est vérifiée qu'en
 * changeant d'écran : un parent en train de modifier un jeu n'est jamais mis dehors.
 *
 * L'échéance est gardée dans sessionStorage : un rafraîchissement ne reverrouille pas,
 * fermer l'onglet ou l'appli, si.
 */
export const UNLOCK_MS = 5 * 60_000;

/**
 * Écrans derrière le verrou : réglages et effacements, joueurs, équipes, jeux et leur édition,
 * dessins gardés (partage et suppression).
 */
const PROTECTED = new Set<Route['name']>([
  'parent',
  'players',
  'teams',
  'add-game',
  'edit-game',
  'drawings',
]);

export function isProtected(route: Route): boolean {
  return PROTECTED.has(route.name);
}
const KEY = 'dis-moi:deverrouillage';

function read(): number {
  try {
    return Number(sessionStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

let unlockedUntil = read();
if (unlockedUntil <= Date.now()) unlockedUntil = 0;
const listeners = new Set<() => void>();

function write(value: number) {
  unlockedUntil = value;
  try {
    if (value) sessionStorage.setItem(KEY, String(value));
    else sessionStorage.removeItem(KEY);
  } catch {
    // Stockage indisponible : le déverrouillage reste en mémoire.
  }
  listeners.forEach((l) => l());
}

export function isUnlocked(): boolean {
  return unlockedUntil > 0;
}

/**
 * À chaque changement d'écran : reverrouille si l'échéance est passée ; sinon, l'ouverture
 * d'un écran parent prolonge (passer d'un jeu à l'autre, non).
 */
export function onNavigate(route: Route, now = Date.now()): void {
  if (!unlockedUntil) return;
  if (now >= unlockedUntil) write(0);
  else if (isProtected(route)) unlock(now);
}

// Écouté avant le routeur (abonné au premier rendu) : l'écran suivant voit l'état à jour.
if (typeof window !== 'undefined')
  window.addEventListener('hashchange', () => onNavigate(parseHash(window.location.hash)));

/** Déverrouille (ou prolonge) pour UNLOCK_MS. */
export function unlock(now = Date.now()): void {
  write(now + UNLOCK_MS);
}

export function lock(): void {
  write(0);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useUnlocked(): boolean {
  return useSyncExternalStore(subscribe, isUnlocked);
}

export interface LockQuestion {
  a: number;
  b: number;
}

/** Une addition facile pour un adulte, hors de portée d'un petit enfant (résultat 10 à 18). */
export function newQuestion(random = Math.random): LockQuestion {
  const pick = () => 5 + Math.floor(random() * 5);
  return { a: pick(), b: pick() };
}

export function isRightAnswer(q: LockQuestion, answer: string): boolean {
  return answer.trim() !== '' && Number(answer.trim()) === q.a + q.b;
}
