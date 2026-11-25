import type { NoteEvent } from './melody';

type AudioCtor = typeof AudioContext;

function audioContextClass(): AudioCtor | undefined {
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext;
}

export function audioAvailable(): boolean {
  return audioContextClass() !== undefined;
}

/**
 * Joue une suite de notes avec un son doux (onde triangle + enveloppe).
 * Pause / reprise par suspension du contexte audio : la position est conservée.
 */
export class MelodyPlayer {
  private ctx: AudioContext | null = null;
  private origin = 0;

  constructor(
    private readonly events: NoteEvent[],
    readonly length: number,
  ) {}

  /** Secondes écoulées depuis le début de l'extrait. */
  get elapsed(): number {
    if (!this.ctx) return 0;
    return Math.min(this.length, Math.max(0, this.ctx.currentTime - this.origin));
  }

  get ended(): boolean {
    return this.ctx !== null && this.elapsed >= this.length;
  }

  async play(): Promise<void> {
    if (this.ctx && !this.ended) {
      await this.ctx.resume();
      return;
    }
    await this.stop();
    const Ctor = audioContextClass();
    if (!Ctor) throw new Error('Audio indisponible');
    const ctx = new Ctor();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.3;
    master.connect(ctx.destination);
    this.origin = ctx.currentTime + 0.05;
    for (const e of this.events) {
      const t = this.origin + e.start;
      const end = t + e.duration;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = e.freq;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + 0.015);
      env.gain.exponentialRampToValueAtTime(0.5, t + Math.min(0.2, e.duration * 0.6));
      env.gain.setValueAtTime(0.5, Math.max(t + 0.02, end - 0.06));
      env.gain.linearRampToValueAtTime(0.0001, end);
      osc.connect(env).connect(master);
      osc.start(t);
      osc.stop(end + 0.02);
    }
    if (ctx.state === 'suspended') await ctx.resume();
  }

  async pause(): Promise<void> {
    await this.ctx?.suspend();
  }

  async stop(): Promise<void> {
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx && ctx.state !== 'closed') await ctx.close();
  }
}
