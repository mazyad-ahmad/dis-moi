import { useSyncExternalStore } from 'react';
import { getSettings, useSettings } from './settings';

/**
 * Fin de séance en douceur (#120). Quand le parent a choisi une durée de séance, le temps
 * compte à partir du premier jeu lancé. À l'échéance, la partie en cours va jusqu'au bout,
 * puis l'appli propose de ranger le téléphone. Une partie à l'avance, elle l'annonce :
 * « Encore une partie, et après on range ».
 *
 * Aucun compte à rebours à l'écran. Une pause de plus de 30 minutes remet tout à zéro. Le
 * parent peut prolonger depuis son espace (derrière le verrou parent s'il est activé).
 *
 * Gardée dans localStorage : ni un rafraîchissement ni la fermeture de l'appli ne remettent
 * le temps à zéro.
 */
export const SESSION_CHOICES = [0, 10, 15, 20, 30] as const;
export const PAUSE_RESET_MS = 30 * 60_000;
export const EXTEND_MS = 10 * 60_000;
/** Durée supposée d'une partie tant qu'aucune n'a été terminée dans la séance. */
const DEFAULT_GAME_MS = 5 * 60_000;

export interface Seance {
  startedAt: number;
  /** Dernière activité (lancement, réponse, fin de partie). */
  lastAt: number;
  /** Temps ajouté par le parent. */
  extraMs: number;
  /** Lancement de la partie en cours. */
  gameStartedAt: number | null;
  /** Durée de la dernière partie terminée : sert à prévoir la dernière. */
  lastGameMs: number | null;
  /** La partie en cours est la dernière. */
  lastGame: boolean;
  /** La prochaine partie sera la dernière (annoncée sur l'écran de fin). */
  nextIsLast: boolean;
  /** Séance terminée : on range. */
  over: boolean;
}

const KEY = 'dis-moi:seance';

function isSeance(v: unknown): v is Seance {
  const s = v as Partial<Seance> | null;
  return (
    !!s &&
    typeof s.startedAt === 'number' &&
    typeof s.lastAt === 'number' &&
    typeof s.extraMs === 'number' &&
    typeof s.over === 'boolean'
  );
}

function read(): Seance | null {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return isSeance(data) ? data : null;
  } catch {
    return null;
  }
}

let current: Seance | null = read();
const listeners = new Set<() => void>();

function write(next: Seance | null) {
  current = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    // Stockage indisponible : la séance reste en mémoire.
  }
  listeners.forEach((l) => l());
}

function minutes(): number {
  return getSettings().sessionMinutes;
}

/** Séance encore valable (réglage actif, pas de longue pause), sinon `null`. */
function live(now: number): Seance | null {
  if (!minutes() || !current) return null;
  return now - current.lastAt > PAUSE_RESET_MS ? null : current;
}

function deadline(s: Seance): number {
  return s.startedAt + minutes() * 60_000 + s.extraMs;
}

/** Une partie est lancée (pas à la reprise après un rafraîchissement). */
export function beginGame(now = Date.now()): void {
  if (!minutes()) return;
  const s: Seance = live(now) ?? {
    startedAt: now,
    lastAt: now,
    extraMs: 0,
    gameStartedAt: null,
    lastGameMs: null,
    lastGame: false,
    nextIsLast: false,
    over: false,
  };
  const left = deadline(s) - now;
  // Déjà annoncée, ou plus assez de temps pour une partie de plus : c'est la dernière.
  const lastGame = s.lastGame || s.nextIsLast || left <= (s.lastGameMs ?? DEFAULT_GAME_MS);
  write({ ...s, lastAt: now, gameStartedAt: now, lastGame, nextIsLast: false });
}

/** Une réponse : la séance est toujours active. */
export function touch(now = Date.now()): void {
  const s = live(now);
  if (s) write({ ...s, lastAt: now });
}

/** La partie en cours vient de se terminer. */
export function endGame(now = Date.now()): void {
  const s = live(now);
  if (!s) return;
  const lastGameMs = s.gameStartedAt !== null ? now - s.gameStartedAt : s.lastGameMs;
  const left = deadline(s) - now;
  const over = s.lastGame || left <= 0;
  write({
    ...s,
    lastAt: now,
    gameStartedAt: null,
    lastGameMs,
    lastGame: false,
    over,
    nextIsLast: !over && left <= (lastGameMs ?? DEFAULT_GAME_MS),
  });
}

/** Le parent accorde un peu de temps en plus. */
export function extend(now = Date.now()): void {
  const s = live(now);
  if (!s) return;
  const extraMs = Math.max(s.extraMs, now - s.startedAt - minutes() * 60_000) + EXTEND_MS;
  write({ ...s, lastAt: now, extraMs, over: false, lastGame: false, nextIsLast: false });
}

/** Le parent repart d'une séance neuve (ou désactive le réglage). */
export function resetSeance(): void {
  write(null);
}

export interface SeanceState {
  /** La partie en cours est la dernière. */
  lastGame: boolean;
  /** Annonce sur l'écran de fin : « Encore une partie, et après on range ». */
  nextIsLast: boolean;
  over: boolean;
  /** Une séance est en cours (pour l'espace Parent). */
  active: boolean;
}

const IDLE: SeanceState = { lastGame: false, nextIsLast: false, over: false, active: false };

export function getSeance(now = Date.now()): SeanceState {
  const s = live(now);
  return s ? { lastGame: s.lastGame, nextIsLast: s.nextIsLast, over: s.over, active: true } : IDLE;
}

export function isSeanceOver(now = Date.now()): boolean {
  return getSeance(now).over;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let cached: SeanceState = IDLE;

function snapshot(): SeanceState {
  const next = getSeance();
  const same = (Object.keys(next) as (keyof SeanceState)[]).every((k) => next[k] === cached[k]);
  if (!same) cached = next;
  return cached;
}

/**
 * État de la séance pour l'affichage. La longue pause est vue au rendu suivant (retour à
 * l'accueil, par exemple), jamais en plein écran.
 */
export function useSeance(): SeanceState {
  useSettings(); // Changer la durée de séance se voit tout de suite.
  return useSyncExternalStore(subscribe, snapshot);
}
