import { getPack } from '../../content/packs';

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
  bpm: number;
  melody: string;
}

export const EXTRACT_SECONDS = 10;

/** Airs du pack `src/content/chansons.json`. */
export const SONGS: Song[] = getPack('chansons').items.map((item) => ({
  id: item.id,
  title: item.answer,
  hint: item.hint!,
  bpm: item.bpm!,
  melody: item.melody!,
}));
