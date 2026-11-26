/**
 * Devine avec tes mains (#134) : des objets du quotidien glissés dans un sac ou une
 * chaussette ; on touche sans regarder, on décrit (doux, dur, rond…), puis on devine.
 * L'appli ne fait que guider : le jeu se passe avec de vrais objets.
 * Objets proposés dans `src/content/catalogue-devine-mains.json` (jeu du catalogue).
 * Ce module ne contient que des données et des fonctions pures.
 */
export const MAINS_ID = 'devine-mains';

/** Objets dans le sac : au plus 6, pour une liste vite rassemblée. */
export const MAINS_MAX = 6;

/**
 * Rappel de sécurité montré au lancement, à chaque partie. Toutes les listes proposées le
 * respectent, pour tous les âges : aucun objet de moins de 4 cm, rien de coupant ni de
 * pointu, rien de chaud, rien qui contienne une pile, rien de fragile, pas de ficelle.
 */
export const SAFETY_RULES: readonly string[] = [
  'Avant 4 ans, rien de plus petit que 4 cm : ça s’avale.',
  'Rien qui coupe ou qui pique.',
  'Rien de chaud.',
  'Pas de pile.',
];

export type Guesser = 'child' | 'parent';

export const GUESSERS: readonly { value: Guesser; label: string }[] = [
  { value: 'child', label: 'L’enfant' },
  { value: 'parent', label: 'Le parent' },
];

export function isGuesser(value: unknown): value is Guesser {
  return GUESSERS.some((g) => g.value === value);
}

/** Qui prépare le sac, en une ligne, sous la liste. */
export const PREPARE_LINE: Record<Guesser, string> = {
  child: 'Le parent glisse ces objets dans un sac ou une chaussette, sans que l’enfant regarde.',
  parent: 'L’enfant glisse ces objets dans un sac ou une chaussette, en cachette du parent.',
};

/** Les trois étapes d'une manche, courtes, lues d'un coup d'œil. */
export const STEPS: readonly { emoji: string; text: string }[] = [
  { emoji: '✋', text: 'Touche sans regarder.' },
  { emoji: '💬', text: 'Dis comment c’est.' },
  { emoji: '🤔', text: 'Devine !' },
];

/** Qui devine, en tête de la manche. */
export const GUESSER_LINE: Record<Guesser, string> = {
  child: 'L’enfant devine',
  parent: 'Le parent devine',
};

/** Questions pour aider à décrire, deux par manche, dans le bloc parent. */
export const DESCRIBE_QUESTIONS: readonly string[] = [
  'C’est doux ou ça gratte ?',
  'C’est dur ou mou ?',
  'C’est rond, plat ou long ?',
  'C’est lourd ou léger ?',
  'C’est lisse ou bosselé ?',
  'C’est froid ou tiède ?',
  'C’est grand comme ta main ?',
  'Ça fait du bruit si on le secoue ?',
  'Ça se plie ?',
  'À quoi ça sert, à ton avis ?',
];

/** Les deux questions de la manche `round` (à partir de 1), sans répétition sur 5 manches. */
export function roundQuestions(round: number): string[] {
  const n = DESCRIBE_QUESTIONS.length;
  const first = (2 * (round - 1)) % n;
  return [DESCRIBE_QUESTIONS[first], DESCRIBE_QUESTIONS[(first + 1) % n]];
}

/** Ce que fait le parent pendant la manche, selon qui devine. */
export const PARENT_LINE: Record<Guesser, string> = {
  child: 'Aide-le à décrire avant de deviner. Sortez l’objet ensemble pour vérifier.',
  parent: 'Décris à voix haute avant de deviner. L’enfant sort l’objet pour vérifier.',
};
