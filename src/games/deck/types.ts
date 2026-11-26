import type { Tint } from '../registry';

/**
 * Format commun d'un jeu « à cartes » : catalogue (#9) et jeux créés par le parent (#10).
 * Une carte = une manche.
 */
export type DeckKind = 'sound' | 'image' | 'draw' | 'question';

export const DECK_KINDS: { value: DeckKind; label: string; category: string }[] = [
  { value: 'sound', label: 'Son', category: 'Son' },
  { value: 'image', label: 'Image', category: 'Image' },
  { value: 'draw', label: 'Mot à dessiner', category: 'Dessin' },
  { value: 'question', label: 'Question', category: 'Question' },
];

export function kindLabel(kind: DeckKind): string {
  return DECK_KINDS.find((k) => k.value === kind)!.label;
}

export interface DeckItem {
  /** Identifiant stable de la carte dans son pack (contenu intégré, src/content/). */
  id?: string;
  /** Âge à partir duquel la carte convient (niveaux par âge). */
  level?: number;
  /** Thèmes de la carte (« ferme », « noel »…). */
  tags?: string[];
  /** Langue de la carte, si elle diffère de celle du pack (code à deux lettres). */
  lang?: string;
  /** Réponse attendue (pour « Mot à dessiner » : le mot). */
  answer: string;
  /**
   * Texte de la carte : question ou devinette lue par le parent (question),
   * bruit à imiter (son), texte montré à l'enfant (image).
   */
  text?: string;
  /** Indice pour le parent. */
  hint?: string;
  /** Indices suivants, donnés un à un si l'enfant sèche (#34). */
  hints?: string[];
  /** Visuels intégrés (catalogue) : emoji ou couleur montrés en grand. */
  emoji?: string;
  color?: string;
  /** Médias du parent, gardés dans IndexedDB. */
  image?: Blob;
  audio?: Blob;
}

export interface Deck {
  id: string;
  name: string;
  /** Sur-titre de l'en-tête de jeu et de la tuile d'accueil. */
  category: string;
  kind: DeckKind;
  tint: Tint;
  /** Marque de la tuile (2-3 caractères). */
  mark: string;
  items: DeckItem[];
}
