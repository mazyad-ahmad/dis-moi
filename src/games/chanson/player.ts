import {
  audioOutput,
  FADE_IN,
  registerAudioSource,
  runningAudioContext,
} from '../../audio/context';
import type { NoteEvent } from './melody';

export { audioAvailable } from '../../audio/context';

/**
 * Joue une suite de notes avec un son doux (onde triangle + enveloppe), sur le contexte audio
 * partagé. Pause / reprise : la position est gardée, la lecture reprend à la note suivante.
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
  ) {}

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
    bus.gain.value = 0.3;
    bus.connect(out);
    this.bus = bus;
    const from = this.offset;
    this.origin = ctx.currentTime + 0.05 - from;
    for (const e of this.events) {
      // Reprise après une pause : on repart de la note suivante.
      if (e.start < from - 0.001) continue;
      const t = this.origin + e.start;
      const end = t + e.duration;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = e.freq;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + FADE_IN);
      env.gain.exponentialRampToValueAtTime(0.5, t + Math.min(0.2, e.duration * 0.6));
      env.gain.setValueAtTime(0.5, Math.max(t + 0.02, end - 0.06));
      env.gain.linearRampToValueAtTime(0.0001, end);
      osc.connect(env).connect(bus);
      osc.start(t);
      osc.stop(end + 0.02);
    }
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
