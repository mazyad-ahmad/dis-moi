import { REWARDS } from '../data/history';
import type { GameRecord } from '../data/db';
import { starsLabel } from '../games/format';
import type { GameInfo } from '../games/registry';

/**
 * Écran de résultat vivant (#33) : textes et calculs, sans affichage.
 */

/** Les étoiles apparaissent une à une : première après le son de fin de partie, puis toutes les… */
export const COUNT_START_MS = 1100;
export const COUNT_STEP_MS = 350;

/** Titre de l'écran, celui que TalkBack annonce en premier. */
export function resultTitle(stars: number): string {
  return stars > 0 ? `${starsLabel(stars)} gagnées ensemble !` : 'Bravo d’avoir joué !';
}

/** Messages selon le score, toujours positifs ; sans étoile, on encourage. */
const MESSAGES = {
  none: [
    'Pas d’étoile cette fois-ci, ce sera pour la prochaine partie.',
    'On a bien joué ensemble, les étoiles viendront la prochaine fois.',
    'Chercher ensemble, c’est déjà gagner. On en refait une ?',
  ],
  some: [
    'Chaque étoile compte, bravo !',
    'Belle partie ! On continue ?',
    'Bien joué ! Les étoiles s’additionnent.',
  ],
  most: [
    'Super partie, bravo à tous !',
    'Quelle belle équipe !',
    'Bravo, vous avez bien cherché !',
  ],
  all: ['Toutes les étoiles, quelle équipe !', 'Un sans-faute, bravo à tous !'],
} as const;

/** `pick` : nombre entre 0 et 1 (hasard), pour varier le message d'une partie à l'autre. */
export function resultMessage(stars: number, rounds: number, pick = Math.random()): string {
  const group =
    stars <= 0
      ? MESSAGES.none
      : stars >= rounds
        ? MESSAGES.all
        : stars * 2 >= rounds
          ? MESSAGES.most
          : MESSAGES.some;
  return group[Math.min(group.length - 1, Math.floor(pick * group.length))];
}

export type Reward = (typeof REWARDS)[number];

export interface ResultRewards {
  /** Récompenses franchies pendant cette partie (souvent aucune, parfois deux). */
  unlocked: Reward[];
  /** Prochaine récompense et étoiles qui manquent ; rien une fois toutes gagnées. */
  next?: { reward: Reward; missing: number };
}

/**
 * Récompenses de la partie qui vient de finir.
 * `records` : l'historique, le plus récent en premier, dont cette partie (enregistrée dès la
 * première manche). Ses étoiles en base peuvent avoir une manche de retard : on ne s'en sert
 * que pour retrouver le total d'avant la partie.
 */
export function resultRewards(records: GameRecord[], stars: number): ResultRewards {
  const [current, ...others] = records;
  const before = current ? others.reduce((sum, r) => sum + r.stars, 0) : 0;
  const after = before + stars;
  const unlocked = REWARDS.filter((r) => r.stars > before && r.stars <= after);
  const reward = REWARDS.find((r) => r.stars > after);
  return { unlocked, next: reward && { reward, missing: reward.stars - after } };
}

/** « Un autre jeu » : le jeu suivant de l'accueil, en revenant au premier après le dernier. */
export function nextGame(games: GameInfo[], id: string | undefined): GameInfo | undefined {
  const others = games.filter((g) => g.id !== id);
  if (!others.length) return undefined;
  const at = games.findIndex((g) => g.id === id);
  return at < 0 ? others[0] : games[(at + 1) % games.length];
}
