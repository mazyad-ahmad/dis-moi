import { getSettings } from '../data/settings';
import { audioBusy, audioOutput, FADE_IN, runningAudioContext } from './context';

/**
 * Sons d'interface, synthétisés (aucun fichier audio) : courts, doux, jamais négatifs.
 * Notes en Hz, temps en secondes.
 */
export type UiSound = 'star' | 'skip' | 'pass' | 'timer' | 'end' | 'reward';

interface Tone {
  freq: number;
  start: number;
  duration: number;
}

interface SoundSpec {
  tones: Tone[];
  /** Volume du son (0 à 1), avant la sortie commune. */
  gain: number;
  type: OscillatorType;
}

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const C6 = 1046.5;
const E6 = 1318.51;
const G6 = 1567.98;

const arpeggio = (freqs: number[], step: number, last: number): Tone[] =>
  freqs.map((freq, i) => ({
    freq,
    start: i * step,
    duration: i === freqs.length - 1 ? last : step * 1.6,
  }));

export const UI_SOUNDS: Record<UiSound, SoundSpec> = {
  // Étoile gagnée : petit arpège montant, clair et joyeux.
  star: { tones: arpeggio([C6, E6, G6], 0.08, 0.3), gain: 0.22, type: 'sine' },
  // Passer : une seule note douce et brève, ni montante ni descendante.
  skip: { tones: [{ freq: G5, start: 0, duration: 0.16 }], gain: 0.12, type: 'sine' },
  // Passer en Devine-tête (#67), quand l'enfant n'a pas l'écran sous les yeux : deux notes
  // égales bien audibles (« toc-toc »), neutres, nettement différentes de l'arpège de l'étoile.
  pass: {
    tones: [
      { freq: E5, start: 0, duration: 0.12 },
      { freq: E5, start: 0.16, duration: 0.14 },
    ],
    gain: 0.2,
    type: 'triangle',
  },
  // Fin du minuteur : deux tintements égaux, comme une clochette.
  timer: {
    tones: [
      { freq: A5, start: 0, duration: 0.25 },
      { freq: A5, start: 0.3, duration: 0.35 },
    ],
    gain: 0.2,
    type: 'sine',
  },
  // Fin de partie : arpège montant complet.
  end: { tones: arpeggio([C5, E5, G5, C6], 0.12, 0.5), gain: 0.22, type: 'triangle' },
  // Récompense débloquée : arpège plus long qui scintille.
  reward: {
    tones: arpeggio([C5, E5, G5, C6, E6, G6], 0.09, 0.6),
    gain: 0.22,
    type: 'triangle',
  },
};

/** Durée totale d'un son, en secondes. */
export function soundLength(name: UiSound): number {
  return Math.max(...UI_SOUNDS[name].tones.map((t) => t.start + t.duration));
}

/**
 * Joue un son d'interface, sauf si le parent a coupé les sons ou si une mélodie,
 * un son enregistré ou une lecture à voix haute est en cours. Ne lève jamais d'erreur.
 */
export async function playSound(name: UiSound): Promise<void> {
  if (!getSettings().sounds || audioBusy()) return;
  let ctx: AudioContext | null;
  try {
    ctx = await runningAudioContext();
  } catch {
    return;
  }
  const out = audioOutput();
  if (!ctx || !out) return;
  const { tones, gain, type } = UI_SOUNDS[name];
  const origin = ctx.currentTime + 0.01;
  for (const tone of tones) {
    const t = origin + tone.start;
    const end = t + tone.duration;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = tone.freq;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + FADE_IN);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(end + 0.02);
  }
}

/**
 * Son joué après une réponse du parent : une récompense débloquée l'emporte,
 * puis la fin de partie, puis l'étoile ou le son neutre de « Passer ».
 * `total` : étoiles gagnées ensemble après cette réponse (inconnu : `null`).
 * `gesture` (Devine-tête, #67) : l'enfant ne voit pas l'écran, chaque geste a son propre son,
 * même à la dernière manche : l'étoile (ou la récompense) pour trouvé, « toc-toc » pour passer.
 */
export function answerSound(
  found: boolean,
  finished: boolean,
  total: number | null,
  rewards: readonly { stars: number }[],
  gesture = false,
): UiSound {
  if (found && total !== null && rewards.some((r) => r.stars === total)) return 'reward';
  if (gesture) return found ? 'star' : 'pass';
  if (finished) return 'end';
  return found ? 'star' : 'skip';
}
