import { audioOutput, registerAudioSource, runningAudioContext } from '../../audio/context';
import { playDrone, playNote, type Timbre } from '../../audio/instruments';
import type { NoteEvent } from './melody';

export { audioAvailable } from '../../audio/context';

/** Niveau commun de la mélodie, avant la sortie de l'appli. */
export const MELODY_GAIN = 0.3;

export interface MelodyOptions {
  /** Instrument qui joue l'air (#46). */
  timbre?: Timbre;
  /** Accompagnement facultatif : fréquence de la tonique tenue en bourdon. */
  drone?: number;
}

/**
 * Joue une suite de notes avec un instrument doux (voir `audio/instruments.ts`), sur le contexte
 * audio partagé, avec un bourdon facultatif. Pause / reprise : la position est gardée, la
 * lecture reprend à la note suivante.
 * Pendant la lecture, aucun son d'interface ne vient la couvrir.
 */
export class MelodyPlayer {
  private ctx: AudioContext | null = null;
  private bus: GainNode | null = null;
  /** Temps du contexte qui correspond au début de l'extrait. */
  private origin = 0;
  /** Position de reprise, en secondes. */
  private offset = 0;
  private playing = false;
  private release: (() => void) | null = null;

  constructor(
    private readonly events: NoteEvent[],
    readonly length: number,
    private readonly options: MelodyOptions = {},
  ) {}

  get timbre(): Timbre {
    return this.options.timbre ?? 'piano';
  }

  /** Secondes écoulées depuis le début de l'extrait. */
  get elapsed(): number {
    if (!this.playing || !this.ctx) return this.offset;
    return Math.min(this.length, Math.max(this.offset, this.ctx.currentTime - this.origin));
  }

  get ended(): boolean {
    return this.playing && this.elapsed >= this.length;
  }

  async play(): Promise<void> {
    if (this.playing) return;
    if (this.offset >= this.length) this.offset = 0;
    const ctx = await runningAudioContext();
    const out = audioOutput();
    if (!ctx || !out) throw new Error('Audio indisponible');
    this.ctx = ctx;
    const bus = ctx.createGain();
    bus.gain.value = MELODY_GAIN;
    bus.connect(out);
    this.bus = bus;
    const from = this.offset;
    this.origin = ctx.currentTime + 0.05 - from;
    for (const e of this.events) {
      // Reprise après une pause : on repart de la note suivante.
      if (e.start < from - 0.001) continue;
      playNote(ctx, bus, this.timbre, e.freq, this.origin + e.start, e.duration);
    }
    if (this.options.drone)
      playDrone(ctx, bus, this.options.drone, this.origin + from, this.origin + this.length);
    this.playing = true;
    this.release ??= registerAudioSource(() => this.playing && !this.ended);
  }

  async pause(): Promise<void> {
    if (!this.playing) return;
    this.offset = this.elapsed;
    this.silence();
    await Promise.resolve();
  }

  async stop(): Promise<void> {
    this.silence();
    this.offset = 0;
    await Promise.resolve();
  }

  /** Coupe les notes programmées (le contexte partagé, lui, continue). */
  private silence() {
    this.playing = false;
    this.bus?.disconnect();
    this.bus = null;
    this.release?.();
    this.release = null;
  }
}
