import { FADE_IN } from './context';

/**
 * Petits instruments synthétisés (Web Audio), sans aucun fichier audio : chaque note est une
 * somme de quelques ondes douces (sinus ou triangle) avec son enveloppe. Moteur commun aux jeux
 * musicaux (« Quelle chanson ? » d'abord).
 *
 * Douceur sur un haut-parleur de téléphone : pas d'onde carrée ni en dents de scie, pas
 * d'harmonique au-dessus de MAX_PARTIAL_HZ (zone criarde des petits haut-parleurs), une montée
 * d'au moins FADE_IN, et une note au plus fort (accompagnement compris) qui reste sous le
 * plafond de la sortie commune.
 */

export type Timbre = 'boite' | 'flute' | 'piano' | 'xylophone';

interface Partial {
  /** Rapport à la fréquence de la note (1 = fondamentale). */
  ratio: number;
  gain: number;
  wave: 'sine' | 'triangle';
}

export interface Instrument {
  /** Montré sous le lecteur : « Joué à la flûte ». */
  label: string;
  emoji: string;
  partials: Partial[];
  /** Montée, en secondes (au moins FADE_IN). */
  attack: number;
  /** Temps pour retomber au niveau tenu, en secondes. */
  decay: number;
  /** Niveau tenu, en part du maximum ; 0 pour un son qui s'éteint tout seul (percussion). */
  sustain: number;
  /** Extinction en fin de note, en secondes. */
  release: number;
}

/** Au-dessus, une harmonique n'est pas jouée : c'est là qu'un petit haut-parleur grésille. */
export const MAX_PARTIAL_HZ = 2500;

export const INSTRUMENTS: Record<Timbre, Instrument> = {
  boite: {
    label: 'à la boîte à musique',
    emoji: '🎁',
    partials: [
      { ratio: 1, gain: 0.6, wave: 'sine' },
      { ratio: 2, gain: 0.15, wave: 'sine' },
      { ratio: 3, gain: 0.06, wave: 'sine' },
    ],
    attack: FADE_IN,
    decay: 0.9,
    sustain: 0,
    release: 0.12,
  },
  flute: {
    label: 'à la flûte',
    emoji: '🎵',
    partials: [
      { ratio: 1, gain: 0.7, wave: 'sine' },
      { ratio: 2, gain: 0.1, wave: 'sine' },
    ],
    attack: 0.07,
    decay: 0.15,
    sustain: 0.8,
    release: 0.08,
  },
  piano: {
    label: 'au piano',
    emoji: '🎹',
    partials: [
      { ratio: 1, gain: 0.6, wave: 'triangle' },
      { ratio: 2, gain: 0.15, wave: 'sine' },
    ],
    attack: FADE_IN,
    decay: 0.3,
    sustain: 0.45,
    release: 0.06,
  },
  xylophone: {
    label: 'au xylophone',
    emoji: '🎶',
    partials: [
      { ratio: 1, gain: 0.7, wave: 'sine' },
      { ratio: 3, gain: 0.1, wave: 'sine' },
    ],
    attack: FADE_IN,
    decay: 0.4,
    sustain: 0,
    release: 0.05,
  },
};

export const TIMBRES = Object.keys(INSTRUMENTS) as Timbre[];

/** Un timbre au hasard. */
export function randomTimbre(random = Math.random): Timbre {
  return TIMBRES[Math.min(TIMBRES.length - 1, Math.floor(random() * TIMBRES.length))];
}

/** Niveau le plus fort d'une note de ce timbre (somme des harmoniques). */
export function peakGain(timbre: Timbre): number {
  return INSTRUMENTS[timbre].partials.reduce((sum, p) => sum + p.gain, 0);
}

/** Niveau du bourdon, à côté de la mélodie. */
export const DRONE_GAIN = 0.18;
/** Montée et extinction du bourdon : il entre et sort en douceur. */
export const DRONE_FADE = 0.3;

/** Ramène la tonique dans l'octave grave encore audible sur un téléphone (do3 à do4). */
export function droneFreq(freq: number): number {
  let f = freq;
  while (f >= 261.5) f /= 2;
  while (f < 130.8) f *= 2;
  return f;
}

/** Joue une note de `timbre` de `t` à `t + duration` (temps du contexte) vers `out`. */
export function playNote(
  ctx: AudioContext,
  out: AudioNode,
  timbre: Timbre,
  freq: number,
  t: number,
  duration: number,
): void {
  const ins = INSTRUMENTS[timbre];
  const end = t + duration;
  const peakAt = t + Math.min(ins.attack, duration / 2);
  const releaseAt = Math.max(peakAt + 0.01, end - ins.release);
  for (const p of ins.partials) {
    const f = freq * p.ratio;
    if (f > MAX_PARTIAL_HZ) continue;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = p.wave;
    osc.frequency.value = f;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(p.gain, peakAt);
    // Retombée vers le niveau tenu (ou presque rien pour un son percuté).
    const held = Math.max(0.0001, p.gain * ins.sustain);
    const decayEnd = Math.min(releaseAt, peakAt + ins.decay);
    env.gain.exponentialRampToValueAtTime(held, decayEnd);
    env.gain.setValueAtTime(held, releaseAt);
    env.gain.linearRampToValueAtTime(0.0001, end);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(end + 0.02);
  }
}

/** Bourdon : la tonique tenue doucement, de `t` à `end`, sous la mélodie. */
export function playDrone(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  t: number,
  end: number,
): void {
  if (end - t < 0.05) return;
  const fade = Math.min(DRONE_FADE, (end - t) / 3);
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = droneFreq(freq);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(DRONE_GAIN, t + fade);
  env.gain.setValueAtTime(DRONE_GAIN, end - fade);
  env.gain.linearRampToValueAtTime(0.0001, end);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(end + 0.02);
}
