import { getSettings, type Volume } from '../data/settings';

/**
 * Un seul `AudioContext` pour toute l'appli (mélodies, sons d'interface, enregistrements…).
 * Tout le son passe par une sortie commune (`audioOutput()`) :
 * entrée → plafond (#121, rien ne dépasse CEILING) → volume de l'appli (doux / normal) → haut-parleur.
 */

/** Amplitude que la somme de tous les sons ne dépasse jamais (≈ −6 dBFS), avant le volume. */
export const CEILING = 0.5;
/** Au-dessus de ce niveau, le plafond arrondit doucement les crêtes au lieu de les couper net. */
const KNEE = 0.4;
/** Volume de l'appli appliqué après le plafond. */
export const VOLUME_GAIN: Record<Volume, number> = { soft: 0.5, normal: 1 };
/** Montée douce au début de chaque son, en secondes : jamais d'attaque brutale. */
export const FADE_IN = 0.02;

/**
 * Courbe du plafond : identique sous KNEE, puis arrondie vers CEILING sans jamais l'atteindre.
 * Une entrée hors de [−1, 1] prend la valeur du bout de la courbe : le plafond tient toujours.
 */
export function ceilingCurve(points = 2049): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(points);
  const room = CEILING - KNEE;
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= KNEE ? a : KNEE + room * Math.tanh((a - KNEE) / room);
    curve[i] = Math.sign(x) * y;
  }
  return curve;
}

type AudioCtor = typeof AudioContext;

function audioContextClass(): AudioCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext;
}

export function audioAvailable(): boolean {
  return audioContextClass() !== undefined;
}

let ctx: AudioContext | null = null;
let output: GainNode | null = null;
let volume: GainNode | null = null;
let listening = false;

/** Après verrouillage puis réveil du téléphone, le navigateur a pu suspendre le son. */
function onVisible() {
  if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running')
    void ctx.resume().catch(() => {});
}

/** Le contexte partagé, créé au premier besoin ; `null` si l'appareil n'a pas de Web Audio. */
export function audioContext(): AudioContext | null {
  if (ctx && ctx.state !== 'closed') return ctx;
  const Ctor = audioContextClass();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  output = ctx.createGain();
  const ceiling = ctx.createWaveShaper();
  ceiling.curve = ceilingCurve();
  volume = ctx.createGain();
  volume.gain.value = VOLUME_GAIN[getSettings().volume];
  output.connect(ceiling).connect(volume).connect(ctx.destination);
  if (!listening) {
    document.addEventListener('visibilitychange', onVisible);
    listening = true;
  }
  return ctx;
}

/**
 * Nœud de sortie commun : chaque son s'y branche plutôt que sur `destination`.
 * Le volume de l'appli suit le réglage du parent à chaque son.
 */
export function audioOutput(): GainNode | null {
  if (!audioContext()) return null;
  if (volume) volume.gain.value = VOLUME_GAIN[getSettings().volume];
  return output;
}

/**
 * Contexte prêt à jouer : relancé s'il a été suspendu (veille, autre appli, iOS « interrupted »).
 * À appeler de préférence pendant un geste (appui), que le navigateur exige pour démarrer le son.
 */
export async function runningAudioContext(): Promise<AudioContext | null> {
  const c = audioContext();
  if (!c) return null;
  if (c.state !== 'running') await c.resume();
  return c;
}

/**
 * Ferme le contexte partagé ; le prochain son en crée un neuf. Appelé après un enregistrement
 * au micro (#141) : sur Android, un contexte ouvert pendant que le micro tourne peut rester
 * routé comme un appel (écouteur, volume très bas) et les sons suivants ne s'entendent plus.
 */
export function releaseAudioContext(): void {
  const old = ctx;
  ctx = null;
  output = null;
  volume = null;
  if (old && old.state !== 'closed') void old.close().catch(() => {});
}

/** Sources qui jouent un son « important » (mélodie, son enregistré) : rien ne doit les couvrir. */
const sources = new Set<() => boolean>();

/** Déclare une source de son ; renvoie de quoi la retirer. */
export function registerAudioSource(isPlaying: () => boolean): () => void {
  sources.add(isPlaying);
  return () => {
    sources.delete(isPlaying);
  };
}

/** Une source déclarée (mélodie, son enregistré), autre que `except`, joue-t-elle ? */
export function sourcePlaying(except?: () => boolean): boolean {
  for (const playing of sources) if (playing !== except && playing()) return true;
  return false;
}

/** Une mélodie, un son enregistré ou une lecture à voix haute (autre que `except`) est-il en cours ? */
export function audioBusy(except?: () => boolean): boolean {
  if (sourcePlaying(except)) return true;
  return typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking;
}

/** Pour les tests : oublie le contexte et les sources. */
export function resetAudioForTests(): void {
  ctx = null;
  output = null;
  volume = null;
  sources.clear();
  if (listening) document.removeEventListener('visibilitychange', onVisible);
  listening = false;
}
