import { getPack } from '../../content/packs';
import type { Level } from '../levels';

/**
 * Comptines et airs traditionnels du domaine public.
 * Les mélodies sont jouées par un petit synthétiseur (aucun enregistrement) :
 * pas de droits d'interprétation ni de fichier audio à télécharger.
 */
export interface Song {
  id: string;
  title: string;
  /** Indice que le parent peut donner à l'enfant. */
  hint: string;
  /** Indices suivants, donnés un à un si l'enfant sèche (#34). */
  hints?: string[];
  /** Phrase pour prolonger la discussion après la réponse (#124). */
  prolonger?: string;
  bpm: number;
  /** Air noté en entier : l'extrait en joue le début, « Chanter ensemble » le tout (#117). */
  melody: string;
  /** Paroles du premier couplet (domaine public), montrées pendant « Chanter ensemble ». */
  lyrics?: string[];
  /** Niveau par âge (#40). */
  level: Level;
  /** Image de la chanson (emoji), montrée parmi les choix de « Répondre en montrant » (#123). */
  emoji?: string;
}

export const EXTRACT_SECONDS = 10;
/** Indice « réécouter plus lentement » : tempo multiplié par ce facteur, mêmes notes. */
export const SLOW_TEMPO = 0.7;

/** Airs du pack `src/content/chansons.json`. */
export const SONGS: Song[] = getPack('chansons').items.map((item) => ({
  id: item.id,
  title: item.answer,
  hint: item.hint!,
  ...(item.hints && { hints: item.hints }),
  ...(item.prolonger && { prolonger: item.prolonger }),
  bpm: item.bpm!,
  melody: item.melody!,
  ...(item.lyrics && { lyrics: item.lyrics }),
  level: item.level,
  ...(item.emoji && { emoji: item.emoji }),
}));
