import type { ChoiceOption } from '../choices/choices';

/**
 * Où ça va ? (#130) : la carte montre un élément (emoji et mot) et deux ou trois familles ;
 * l'enfant dit où il va et pourquoi, le parent valide. Cartes dans
 * `src/content/catalogue-tri.json` (jeu du catalogue, type `question`) : `answer` l'élément
 * avec son article, `emoji` son image, `text` la phrase d'explication lue par le parent, et
 * `tags` le thème (`tri-animaux`…) suivi de la ou des familles où il va. Plusieurs familles :
 * la carte est discutable, signalée au parent, et chacune de ces réponses est acceptée.
 */
export const TRI_ID = 'tri';

/** Une famille où ranger les éléments, montrée en grand (emoji et nom). */
export interface TriFamily {
  key: string;
  label: string;
  emoji: string;
}

export interface TriTheme {
  id: string;
  name: string;
  /** Début de la question après l'élément : « La vache, ça vit à la ferme… ? ». */
  lead: string;
  families: TriFamily[];
}

/** Préfixe du thème dans les `tags` d'une carte. */
export const TRI_TAG = 'tri-';

export const TRI_THEMES: readonly TriTheme[] = [
  {
    id: 'animaux',
    name: 'Animaux',
    lead: 'ça vit',
    families: [
      { key: 'ferme', label: 'À la ferme', emoji: '🚜' },
      { key: 'foret', label: 'Dans la forêt', emoji: '🌲' },
      { key: 'mer', label: 'Dans la mer', emoji: '🌊' },
    ],
  },
  {
    id: 'aliments',
    name: 'Aliments',
    lead: 'c’est',
    families: [
      { key: 'fruit', label: 'Un fruit', emoji: '🍎' },
      { key: 'legume', label: 'Un légume', emoji: '🥕' },
    ],
  },
  {
    id: 'vetements',
    name: 'Vêtements',
    lead: 'c’est',
    families: [
      { key: 'ete', label: 'Pour l’été', emoji: '☀️' },
      { key: 'hiver', label: 'Pour l’hiver', emoji: '❄️' },
    ],
  },
  {
    id: 'objets',
    name: 'Objets de la maison',
    lead: 'ça va',
    families: [
      { key: 'cuisine', label: 'Dans la cuisine', emoji: '🍳' },
      { key: 'salle-de-bain', label: 'Dans la salle de bain', emoji: '🛁' },
    ],
  },
  {
    id: 'temperature',
    name: 'Chaud ou froid',
    lead: 'c’est',
    families: [
      { key: 'chaud', label: 'Chaud', emoji: '🔥' },
      { key: 'froid', label: 'Froid', emoji: '🧊' },
    ],
  },
  {
    id: 'transports',
    name: 'Transports',
    lead: 'ça va',
    families: [
      { key: 'route', label: 'Sur la route', emoji: '🛣️' },
      { key: 'ciel', label: 'Dans le ciel', emoji: '☁️' },
      { key: 'eau', label: 'Sur l’eau', emoji: '💧' },
    ],
  },
];

/** Ce qu'une carte « Où ça va ? » propose et accepte. */
export interface TriCard {
  theme: TriTheme;
  /** Familles où l'élément va, dans l'ordre du thème : une, ou plusieurs si c'est discutable. */
  accepted: TriFamily[];
  /** Plusieurs familles vont : signalé au parent plutôt que tranché. */
  debatable: boolean;
}

/** Carte « Où ça va ? » d'après ses thèmes, ou rien (thème inconnu, aucune famille du thème). */
export function triOf(item: { tags?: readonly string[] }): TriCard | undefined {
  const tags = item.tags ?? [];
  const theme = TRI_THEMES.find((t) => tags.includes(TRI_TAG + t.id));
  if (!theme) return undefined;
  const accepted = theme.families.filter((f) => tags.includes(f.key));
  if (!accepted.length) return undefined;
  return { theme, accepted, debatable: accepted.length > 1 };
}

const lowerFirst = (s: string) => s.charAt(0).toLocaleLowerCase('fr') + s.slice(1);

/** Les familles dites à voix haute : « à la ferme, dans la forêt ou dans la mer ». */
export function familiesSpoken(theme: TriTheme): string {
  const names = theme.families.map((f) => lowerFirst(f.label));
  return `${names.slice(0, -1).join(', ')} ou ${names[names.length - 1]}`;
}

/** Question lue par le parent : « La vache, ça vit à la ferme, dans la forêt ou dans la mer ? » */
export function triQuestion(item: { answer: string }, theme: TriTheme): string {
  return `${item.answer}, ${theme.lead} ${familiesSpoken(theme)} ?`;
}

/** Les familles du thème, en choix de « Répondre en montrant » (#123). */
export function familyOptions(theme: TriTheme): ChoiceOption[] {
  return theme.families.map((f) => ({ key: f.key, label: f.label, emoji: f.emoji }));
}
