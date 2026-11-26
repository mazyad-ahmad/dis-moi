/**
 * Niveau sonore (#121) : mesure d'un son et gain pour le ramener au niveau commun de l'appli.
 * Amplitudes entre 0 et 1 (1 = pleine échelle, 0 dBFS).
 */

/** Niveau efficace visé pour un enregistrement ou un fichier audio (≈ −22 dBFS). */
export const TARGET_RMS = 0.08;
/** Crête maximale d'un son ramené au niveau commun (≈ −7 dBFS). */
export const TARGET_PEAK = 0.45;
/** On n'amplifie pas plus (un chuchotement ne devient pas du souffle). */
export const MAX_BOOST = 4;

/** Fichiers ajoutés à l'appli : écart toléré autour du niveau visé, en dB. */
export const FILE_TOLERANCE_DB = 3;
/** Fichiers ajoutés à l'appli : crête maximale (≈ −1 dBFS). */
export const FILE_MAX_PEAK = 0.9;

export interface Level {
  /** Niveau efficace des passages sonores (silences ignorés). */
  rms: number;
  /** Plus grande amplitude. */
  peak: number;
}

/** Durée d'un bloc de mesure, en secondes. */
const BLOCK_SECONDS = 0.05;
/** Bloc sous ce niveau : silence (−50 dBFS). */
const SILENCE = 0.003;
/** Bloc plus de 30 dB sous le plus fort : bruit de fond, ignoré. */
const RELATIVE_GATE = 10 ** (-30 / 20);

export const toDb = (amplitude: number) => 20 * Math.log10(amplitude);

/** Mesure un son (un tableau d'échantillons par canal). */
export function measureLevel(channels: readonly Float32Array[], sampleRate: number): Level {
  const length = channels[0]?.length ?? 0;
  const block = Math.max(1, Math.round(sampleRate * BLOCK_SECONDS));
  let peak = 0;
  const powers: number[] = [];
  for (let from = 0; from < length; from += block) {
    const to = Math.min(length, from + block);
    let sum = 0;
    for (const data of channels)
      for (let i = from; i < to; i++) {
        const v = data[i];
        sum += v * v;
        if (Math.abs(v) > peak) peak = Math.abs(v);
      }
    powers.push(sum / ((to - from) * channels.length));
  }
  const loudest = Math.max(0, ...powers);
  const gate = Math.max(SILENCE, Math.sqrt(loudest) * RELATIVE_GATE) ** 2;
  const kept = powers.filter((p) => p >= gate);
  const rms = kept.length ? Math.sqrt(kept.reduce((a, b) => a + b, 0) / kept.length) : 0;
  return { rms, peak };
}

/**
 * Gain qui ramène un son au niveau commun : niveau efficace visé, sans dépasser la crête
 * permise ni amplifier plus que MAX_BOOST. Un son muet garde son niveau.
 */
export function normalizeGain({ rms, peak }: Level): number {
  if (peak <= 0) return 1;
  const byPeak = TARGET_PEAK / peak;
  if (rms <= 0) return Math.min(1, byPeak);
  return Math.min(TARGET_RMS / rms, byPeak, MAX_BOOST);
}

/**
 * Contrôle d'un fichier audio ajouté à l'appli : null s'il est au niveau commun,
 * sinon ce qu'il faut corriger.
 */
export function checkFileLevel({ rms, peak }: Level): string | null {
  if (rms <= 0) return 'fichier muet';
  if (peak > FILE_MAX_PEAK)
    return `crête trop forte (${toDb(peak).toFixed(1)} dBFS, maximum ${toDb(FILE_MAX_PEAK).toFixed(1)})`;
  const gap = toDb(rms) - toDb(TARGET_RMS);
  if (Math.abs(gap) > FILE_TOLERANCE_DB)
    return `niveau ${toDb(rms).toFixed(1)} dBFS, attendu ${toDb(TARGET_RMS).toFixed(1)} ± ${FILE_TOLERANCE_DB} : appliquer un gain de ${(-gap).toFixed(1)} dB`;
  return null;
}
