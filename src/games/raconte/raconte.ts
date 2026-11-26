import { getPack, type PackItem } from '../../content/packs';

/**
 * Raconte-moi (#125) : des questions ouvertes, sans bonne réponse, pour se parler.
 * L'enfant répond, le parent aussi ; « Merci de m'avoir raconté » donne l'étoile, gagnée
 * ensemble, et « Passer » change de question sans rien dire. Rien n'est écrit ni enregistré :
 * seules les étoiles de la partie sont gardées, comme dans les autres jeux.
 */
export const RACONTE_ID = 'raconte';
export const RACONTE_NAME = 'Raconte-moi';
export const RACONTE_CATEGORY = 'Se parler';
export const THANKS_LABEL = 'Merci de m’avoir raconté';

/** Questions du pack, la question est dans `answer` (voir docs/PACKS.md). */
export const CHAT_QUESTIONS: readonly PackItem[] = getPack(RACONTE_ID).items;

/** Fin de partie sans étoile (tout passé) : un mot doux, jamais « pas d'étoile ». */
export const NO_STAR_MESSAGE = 'Merci pour ce moment ensemble. On se racontera d’autres choses !';
