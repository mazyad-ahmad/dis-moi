/**
 * Ni oui ni non (#135) : le parent pose des questions, l'enfant répond sans jamais dire « oui »
 * ni « non ». Les rôles peuvent s'inverser : l'enfant pose les questions, le parent répond.
 * Une manche = des questions enchaînées jusqu'à ce qu'on en tienne 5 (une étoile) ou qu'un
 * « oui » ou un « non » s'échappe (on rit, manche suivante). Pas de minuteur.
 * Questions dans `src/content/catalogue-ni-oui-ni-non.json` (jeu du catalogue, niveau Grands).
 * Ce module ne contient que des données et des fonctions pures.
 */
export const NIOUI_ID = 'ni-oui-ni-non';

/** Questions à tenir dans une manche pour gagner l'étoile. */
export const HOLD_GOAL = 5;

/** Qui répond pendant la manche. */
export type Answerer = 'child' | 'parent';

export const ANSWERERS: readonly { value: Answerer; label: string }[] = [
  { value: 'child', label: 'L’enfant' },
  { value: 'parent', label: 'Le parent' },
];

export function isAnswerer(value: unknown): value is Answerer {
  return ANSWERERS.some((a) => a.value === value);
}

/** Qui pose la question, en tête de la carte. */
export const ASKER_LINE: Record<Answerer, string> = {
  child: 'Le parent pose la question',
  parent: 'L’enfant pose la question',
};

/** Consigne du parent, selon qui répond. */
export const RULE_LINE: Record<Answerer, string> = {
  child: 'L’enfant répond sans dire « oui » ni « non ». Enchaîne vite, relance : « Tu es sûr ? »',
  parent: 'Tu réponds sans dire « oui » ni « non ». Un oui t’échappe ? Tout le monde rit !',
};

/** Après un « oui » ou un « non » échappé : rien de grave, on rit et on repart. */
export const SLIP_LINE = 'Raté, on rit ! Nouvelle manche. Et si on changeait de rôle ?';

/** Une question piège (« Tu es sûr ? ») : thème `astuce`. */
export function isTrick(item: { tags?: readonly string[] }): boolean {
  return !!item.tags?.includes('astuce');
}

/** Où en est la partie : prochaine question à poser, questions tenues dans la manche. */
export interface Pace {
  next: number;
  held: number;
}

export function restorePace(saved: unknown, total: number): Pace | undefined {
  const p = saved as Partial<Pace> | null;
  const ok = (n: unknown, max: number): n is number =>
    Number.isInteger(n) && (n as number) >= 0 && (n as number) < max;
  return p && ok(p.next, Math.max(total, 1)) && ok(p.held, HOLD_GOAL)
    ? { next: p.next, held: p.held }
    : undefined;
}

/**
 * Réponse du parent à une question : tenue ou non. Renvoie la suite et, si la manche se
 * termine, si elle rapporte l'étoile. Les questions repartent du début une fois toutes posées.
 */
export function step(
  pace: Pace,
  held: boolean,
  total: number,
): { pace: Pace; done?: { star: boolean } } {
  const next = (pace.next + 1) % Math.max(total, 1);
  if (!held) return { pace: { next, held: 0 }, done: { star: false } };
  if (pace.held + 1 >= HOLD_GOAL) return { pace: { next, held: 0 }, done: { star: true } };
  return { pace: { next, held: pace.held + 1 } };
}
