/**
 * Mélodies écrites en notation texte : « C4 D4 E4:2 R:.5 F#4:.5 ».
 * Chaque note = nom (A-G), altération facultative (# ou b), octave, puis durée en temps (1 par défaut).
 * « R » est un silence.
 */
export interface Note {
  /** Fréquence en Hz, `null` pour un silence. */
  freq: number | null;
  beats: number;
}

export interface NoteEvent {
  freq: number;
  /** Début et durée en secondes. */
  start: number;
  duration: number;
}

const SEMITONES: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

/** Fréquence d'une note (la4 = 440 Hz). */
export function noteFreq(name: string): number {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) throw new Error(`Note inconnue : ${name}`);
  const [, letter, accidental, octave] = m;
  const n =
    SEMITONES[letter] +
    (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) +
    (Number(octave) - 4) * 12;
  return 440 * 2 ** (n / 12);
}

export function parseMelody(src: string): Note[] {
  return src
    .trim()
    .split(/\s+/)
    .filter((t) => t !== '|')
    .map((token) => {
      const [name, beats = '1'] = token.split(':');
      const b = Number(beats);
      if (!(b > 0)) throw new Error(`Durée invalide : ${token}`);
      return { freq: name === 'R' ? null : noteFreq(name), beats: b };
    });
}

/** Place les notes dans le temps, en s'arrêtant à `maxSeconds`. */
export function schedule(notes: Note[], bpm: number, maxSeconds: number): NoteEvent[] {
  const beat = 60 / bpm;
  const events: NoteEvent[] = [];
  let t = 0;
  for (const n of notes) {
    if (t >= maxSeconds) break;
    const duration = Math.min(n.beats * beat, maxSeconds - t);
    if (n.freq !== null) events.push({ freq: n.freq, start: t, duration });
    t += n.beats * beat;
  }
  return events;
}

/** Durée de l'air complet en secondes, silences compris (« Chanter ensemble », #117). */
export function melodySeconds(notes: Note[], bpm: number): number {
  return (notes.reduce((sum, n) => sum + n.beats, 0) * 60) / bpm;
}

/** Durée totale de l'extrait en secondes. */
export function extractLength(events: NoteEvent[]): number {
  const last = events[events.length - 1];
  return last ? last.start + last.duration : 0;
}

/** Tonique de l'air : sa dernière note jouée (les comptines finissent sur la tonique). */
export function tonic(notes: Note[]): number | null {
  for (let i = notes.length - 1; i >= 0; i--) if (notes[i].freq !== null) return notes[i].freq;
  return null;
}
