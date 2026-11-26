/**
 * Façons de jouer à Dessine ça (#53). Chaque variante garde le même dessin, les mêmes outils
 * et le même minuteur ; seuls le mot affiché et la phrase sous le dessin changent.
 */
export type Variant = 'classique' | 'mystere' | 'deux' | 'yeux';

export interface VariantInfo {
  value: Variant;
  label: string;
  /** L'explication d'une phrase, lue avant de jouer (rien pour le jeu habituel). */
  about?: string;
}

export const VARIANTS: readonly VariantInfo[] = [
  { value: 'classique', label: 'Classique' },
  {
    value: 'mystere',
    label: 'Mystère',
    about: "L'enfant lit le mot en secret, le cache, puis dessine : c'est le parent qui devine.",
  },
  {
    value: 'deux',
    label: 'À deux',
    about: "Un trait chacun, à tour de rôle : l'enfant commence, le parent continue.",
  },
  {
    value: 'yeux',
    label: 'Yeux fermés',
    about: 'On dessine les yeux fermés, puis on les ouvre pour rire ensemble du dessin.',
  },
];

/** Variante retrouvée après un rafraîchissement ; inconnue, elle est ignorée. */
export const restoreVariant = (saved: unknown): Variant | undefined =>
  VARIANTS.find((v) => v.value === saved)?.value;

/** À deux : à qui le tour, d'après le nombre de traits déjà tracés (l'enfant commence). */
export const twoTurn = (strokes: number, child = "l'enfant") =>
  strokes % 2 === 0 ? `Au tour de ${child} : un trait` : 'Au tour du parent : un trait';

/** La phrase sous le dessin, selon la variante, le minuteur et les traits déjà tracés. */
export function drawHint(
  variant: Variant,
  { timeUp, strokes, child }: { timeUp: boolean; strokes: number; child?: string },
): string {
  if (timeUp)
    return variant === 'mystere'
      ? 'Temps écoulé ! Le parent devine.'
      : 'Temps écoulé ! Le parent valide le dessin.';
  switch (variant) {
    case 'mystere':
      return "L'enfant dessine, le parent devine";
    case 'deux':
      return twoTurn(strokes, child);
    case 'yeux':
      return 'Les yeux fermés ! On les ouvre à la fin';
    default:
      return "L'enfant dessine avec le doigt";
  }
}
