import { schedule, tonic, type Note, type NoteEvent } from './melody';
import { EXTRACT_SECONDS, SLOW_TEMPO } from './songs';

/**
 * Façons de faire écouter l'air (#47). Toutes passent par `schedule` et le même lecteur :
 * seules les notes données, le tempo ou la hauteur changent.
 */
export type Variant = 'extrait' | 'petit-a-petit' | 'ralenti' | 'accelere' | 'rythme';

/** Choix du parent : une variante, ou une tirée au sort à chaque manche. */
export type VariantChoice = Variant | 'hasard';

export interface VariantInfo {
  label: string;
  /** Une phrase, affichée sous le lecteur. */
  explain: string;
  /** Tempo multiplié par ce facteur (mêmes notes). */
  tempo: number;
}

/** Tempo de « En accéléré ». */
export const FAST_TEMPO = 1.4;

export const VARIANTS: Record<Variant, VariantInfo> = {
  extrait: {
    label: 'L’extrait',
    explain: `Les ${EXTRACT_SECONDS} premières secondes de l’air.`,
    tempo: 1,
  },
  'petit-a-petit': {
    label: 'Petit à petit',
    explain: '3 notes d’abord, puis 5, puis 10, puis tout l’extrait.',
    tempo: 1,
  },
  ralenti: {
    label: 'Au ralenti',
    explain: 'L’air est joué plus lentement que d’habitude.',
    tempo: SLOW_TEMPO,
  },
  accelere: {
    label: 'En accéléré',
    explain: 'L’air est joué plus vite que d’habitude.',
    tempo: FAST_TEMPO,
  },
  rythme: {
    label: 'Le rythme seul',
    explain: 'Toutes les notes sur la même hauteur : on reconnaît l’air à son rythme.',
    tempo: 1,
  },
};

export const VARIANT_IDS = Object.keys(VARIANTS) as Variant[];

export const HASARD = {
  label: 'Au hasard',
  explain: 'Une façon d’écouter tirée au sort à chaque manche.',
};

/** Nombre de notes jouées à chaque palier de « Petit à petit » ; `null` : tout l'extrait. */
export const STEPS: readonly (number | null)[] = [3, 5, 10, null];

export function isVariantChoice(v: unknown): v is VariantChoice {
  return v === 'hasard' || VARIANT_IDS.includes(v as Variant);
}

export function randomVariant(): Variant {
  return VARIANT_IDS[Math.floor(Math.random() * VARIANT_IDS.length)];
}

/** Les `count` premières notes jouées (les silences entre elles sont gardés). */
export function firstNotes(notes: Note[], count: number): Note[] {
  const out: Note[] = [];
  let played = 0;
  for (const n of notes) {
    if (played >= count) break;
    out.push(n);
    if (n.freq !== null) played++;
  }
  return out;
}

/**
 * Notes placées dans le temps pour une variante.
 * `step` : palier de « Petit à petit » ; `slow` : indice « air ralenti », qui ralentit encore.
 */
export function variantSchedule(
  notes: Note[],
  bpm: number,
  variant: Variant = 'extrait',
  step = 0,
  slow = false,
): NoteEvent[] {
  const factor = VARIANTS[variant].tempo * (slow ? SLOW_TEMPO : 1);
  let played = notes;
  if (variant === 'petit-a-petit') {
    const count = STEPS[Math.min(step, STEPS.length - 1)];
    if (count !== null) played = firstNotes(notes, count);
  }
  if (variant === 'rythme') {
    const pitch = tonic(notes);
    played = played.map((n) => (n.freq === null ? n : { ...n, freq: pitch }));
  }
  // Mêmes notes que l'extrait, quel que soit le tempo.
  return schedule(played, bpm * factor, EXTRACT_SECONDS / factor);
}
