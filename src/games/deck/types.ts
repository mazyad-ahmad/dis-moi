import type { Level } from '../levels';
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
  /** Niveau par âge (#40) : 1 Petits, 2 Moyens, 3 Grands. Sans niveau : convient à tous. */
  level?: Level;
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
  /** Phrase pour prolonger la discussion après la réponse (#124), pour le parent. */
  prolonger?: string;
  /**
   * Question pour en parler ensemble, ouverte et bienveillante (Les émotions, #58), montrée
   * au parent avec la réponse.
   */
  talk?: string;
  /** Visuels intégrés (catalogue) : emoji ou couleur montrés en grand. */
  emoji?: string;
  color?: string;
  /**
   * Médias des jeux intégrés (#118), embarqués dans l'appli : vrai son à faire écouter
   * (« Écouter le cri ») et photo montrée une fois la réponse donnée.
   */
  soundUrl?: string;
  photoUrl?: string;
  /**
   * Ombres (#61) : la carte est montrée en silhouette (emoji) ou dans l'ombre (photo), puis en
   * couleur après « Voir la réponse ». Posé d'après le jeu (pack ou jeu créé), jamais enregistré.
   */
  shadow?: boolean;
  /** L'intrus (#63) : les trois images qui vont ensemble ; l'intrus est `emoji`. */
  others?: string[];
  /** Remets dans l'ordre (#131) : les étapes de la séquence, dans l'ordre attendu. */
  steps?: { text: string; emoji?: string }[];
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
  /** Image cachée (#62) d'un jeu créé ; absente : réglage du catalogue (`revealCatalogue`). */
  reveal?: boolean;
}
