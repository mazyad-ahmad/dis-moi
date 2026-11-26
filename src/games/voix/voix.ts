import { getPack, type PackItem } from '../../content/packs';
import { EFFECTS, type VoiceEffect } from './effects';

/**
 * Voix rigolotes (#70) : l'enfant dit une phrase proposée, puis se réentend en robot, souris,
 * géant ou écho. Défi : le parent devine la voix, ou la phrase. Tout se passe sur le téléphone :
 * l'enregistrement reste en mémoire le temps de la manche, puis il est effacé ; il n'est jamais
 * écrit dans la base, ni dans la partie enregistrée, ni envoyé. Sans micro (refusé ou absent),
 * on fait les voix soi-même.
 */
export const VOIX_ID = 'voix';
export const VOIX_NAME = 'Voix rigolotes';
export const VOIX_CATEGORY = 'Voix';

/** Phrases du pack (`src/content/voix.json`) : la phrase dans `answer`, une image dans `emoji`. */
export const PHRASES: readonly PackItem[] = getPack(VOIX_ID).items;

/** Durée maximale d'un enregistrement, en secondes : une phrase, pas plus. */
export const VOICE_MAX_SECONDS = 8;

/**
 * Défi de la manche, en alternance : d'abord « Devine la voix » (la phrase est connue, la voix
 * est une surprise), puis « Devine ma phrase » (l'enfant choisit la voix, le parent devine).
 */
export type Challenge = 'voix' | 'phrase';

export function challengeAt(round: number): Challenge {
  return round % 2 === 1 ? 'voix' : 'phrase';
}

export const CHALLENGE_NAME: Record<Challenge, string> = {
  voix: 'Devine la voix',
  phrase: 'Devine ma phrase',
};

/** Voix surprise de la manche, tirée au hasard. */
export function surpriseEffect(random: () => number = Math.random): VoiceEffect {
  return EFFECTS[Math.min(EFFECTS.length - 1, Math.floor(random() * EFFECTS.length))].id;
}
