import { audioBusy, audioOutput, FADE_IN, runningAudioContext } from '../../audio/context';
import { PHASE_MS, type Phase } from './exercises';

/**
 * Son doux facultatif de « Respire comme… » (#126) : une note tenue, synthétisée (aucun
 * fichier, aucun droit), qui monte un peu à l'inspiration et redescend en soufflant.
 * Montée et descente lentes, volume bas, par la sortie commune (plafond et volume de l'appli).
 */
export const BREATH_TONE: Record<Phase, { from: number; to: number }> = {
  in: { from: 220, to: 294 },
  out: { from: 294, to: 196 },
};
/** Volume de la note, avant la sortie commune : plus bas que les sons d'interface. */
export const BREATH_GAIN = 0.1;

/**
 * Joue la note d'un temps de respiration. Rend une fonction qui l'arrête (quitter l'écran).
 * Ne couvre jamais une mélodie, un son enregistré ou une lecture en cours ; ne lève jamais.
 */
export async function playBreath(phase: Phase): Promise<() => void> {
  const none = () => {};
  if (audioBusy()) return none;
  let ctx: AudioContext | null;
  try {
    ctx = await runningAudioContext();
  } catch {
    return none;
  }
  const out = audioOutput();
  if (!ctx || !out) return none;
  const { from, to } = BREATH_TONE[phase];
  const t = ctx.currentTime + 0.01;
  const length = PHASE_MS[phase] / 1000;
  const end = t + length;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = from;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.linearRampToValueAtTime(to, end);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(BREATH_GAIN * 0.2, t + FADE_IN);
  env.gain.linearRampToValueAtTime(BREATH_GAIN, t + length * 0.4);
  env.gain.linearRampToValueAtTime(0.0001, end);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(end + 0.02);
  return () => {
    try {
      env.gain.cancelScheduledValues(0);
      env.gain.value = 0;
      osc.stop();
    } catch {
      // Déjà arrêtée.
    }
  };
}
