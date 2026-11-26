import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { checkFileLevel, measureLevel, TARGET_RMS } from '../audio/level';
import { encodeWav, parseWav } from '../test/wav';

/**
 * Contrôle de niveau (#121) : tout fichier audio livré avec l'appli (src/, public/) est
 * normalisé au niveau commun au moment de l'ajout. Format accepté : WAV (PCM ou flottant).
 */

const ROOT = join(import.meta.dirname, '../..');
const AUDIO = ['.wav', '.mp3', '.ogg', '.oga', '.opus', '.m4a', '.aac', '.flac', '.webm', '.weba'];

function audioFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return audioFiles(path);
    return AUDIO.includes(extname(e.name).toLowerCase()) ? [path] : [];
  });
}

/** Problème de niveau d'un fichier, ou null. */
function problem(bytes: Uint8Array): string | null {
  let pcm;
  try {
    pcm = parseWav(bytes);
  } catch (e) {
    return `${(e as Error).message} : convertir en WAV pour que le niveau soit contrôlé`;
  }
  return checkFileLevel(measureLevel(pcm.channels, pcm.sampleRate));
}

describe('fichiers audio', () => {
  it('sont tous au niveau commun', () => {
    const files = ['src', 'public'].flatMap((d) => audioFiles(join(ROOT, d)));
    const problems = files
      .map((f) => [relative(ROOT, f), problem(readFileSync(f))] as const)
      .filter(([, p]) => p)
      .map(([f, p]) => `${f} : ${p}`);
    expect(problems).toEqual([]);
  });

  it('le contrôle repère un fichier trop fort ou dans un autre format', () => {
    const rate = 8000;
    const tone = (amplitude: number) =>
      Float32Array.from(
        { length: rate },
        (_, i) => amplitude * Math.sin((2 * Math.PI * 440 * i) / rate),
      );
    expect(problem(encodeWav(tone(TARGET_RMS * Math.SQRT2), rate))).toBeNull();
    expect(problem(encodeWav(tone(0.99), rate))).toMatch(/crête trop forte/);
    expect(problem(new TextEncoder().encode('ID3 pas un wav'))).toMatch(/convertir en WAV/);
    // Lecture fidèle : un WAV relu donne les mêmes échantillons (à la quantification près).
    const back = parseWav(encodeWav(tone(0.5), rate));
    expect(back.sampleRate).toBe(rate);
    for (const i of [1, 5, 9]) expect(back.channels[0][i]).toBeCloseTo(tone(0.5)[i], 3);
  });
});
