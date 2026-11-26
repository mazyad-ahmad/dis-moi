import {
  audioOutput,
  FADE_IN,
  registerAudioSource,
  runningAudioContext,
  VOLUME_GAIN,
} from '../../audio/context';
import { measureLevel, normalizeGain } from '../../audio/level';
import { UNMEASURED_GAIN } from '../../audio/recording';
import { appVolume } from '../../data/settings';

/**
 * Voix rigolotes (#70) : la phrase enregistrée est rejouée déformée, entièrement sur le
 * téléphone, par Web Audio. Rien n'est envoyé ni gardé : le son reste en mémoire le temps de
 * la manche (voir VoixGame), et ce module ne le garde pas non plus.
 *
 * Volume limité : le son est d'abord ramené au niveau commun (crête ≈ −7 dBFS, ×4 au plus),
 * chaque effet est réglé pour ne jamais dépasser ce niveau (l'écho est baissé d'autant que ses
 * répétitions s'ajoutent), puis tout passe par la sortie commune (#121) : plafond, puis volume
 * de l'appli (doux au coucher).
 */
export type VoiceEffect = 'robot' | 'souris' | 'geant' | 'echo';

export interface EffectInfo {
  id: VoiceEffect;
  name: string;
  emoji: string;
  /** Sans micro : comment faire cette voix soi-même. */
  how: string;
}

export const EFFECTS: readonly EffectInfo[] = [
  { id: 'robot', name: 'Robot', emoji: '🤖', how: 'une voix plate et saccadée, bip bip' },
  { id: 'souris', name: 'Souris', emoji: '🐭', how: 'une toute petite voix aiguë et rapide' },
  { id: 'geant', name: 'Géant', emoji: '🦣', how: 'une grosse voix grave et lente' },
  { id: 'echo', name: 'Écho', emoji: '⛰️', how: 'répéter la fin des mots, de plus en plus bas' },
];

export function effectInfo(id: VoiceEffect): EffectInfo {
  return EFFECTS.find((e) => e.id === id)!;
}

/** Vitesse de lecture : plus vite, c'est plus aigu (souris) ; plus lent, plus grave (géant). */
export const EFFECT_RATE: Record<VoiceEffect, number> = {
  robot: 1,
  souris: 1.6,
  geant: 0.65,
  echo: 1,
};
/** Robot : la voix est modulée par une note grave (modulation en anneau), en hertz. */
export const ROBOT_HZ = 55;
/** Écho : retard entre deux répétitions (s) et part de chaque répétition gardée. */
export const ECHO_DELAY = 0.28;
export const ECHO_FEEDBACK = 0.45;
/** Le temps que l'écho s'éteigne après la fin de la phrase (sous −40 dB), en secondes. */
export const ECHO_TAIL =
  Math.ceil((Math.log(0.01) / Math.log(ECHO_FEEDBACK)) * ECHO_DELAY * 10) / 10;

/**
 * Gain propre à l'effet. La voix et toutes ses répétitions d'écho, ajoutées au pire en phase,
 * valent 1 / (1 − ECHO_FEEDBACK) fois la voix : on la baisse d'autant. La modulation du robot
 * multiplie la voix par une sinusoïde (au plus 1) : rien à baisser.
 */
export function effectGain(effect: VoiceEffect): number {
  return effect === 'echo' ? 1 - ECHO_FEEDBACK : 1;
}

/** Crête au pire d'un son à la crête `peak` après l'effet (la voix plus tous ses échos). */
export function worstPeak(effect: VoiceEffect, peak: number): number {
  const echoes = effect === 'echo' ? 1 / (1 - ECHO_FEEDBACK) : 1;
  return peak * effectGain(effect) * echoes;
}

/** Descente à l'arrêt, en secondes : pas de clic. */
const FADE_OUT = 0.03;

export interface VoicePlayback {
  stop: () => void;
  playing: () => boolean;
  ended: Promise<void>;
}

let current: VoicePlayback | null = null;

/** Arrête la voix en cours, s'il y en a une (fin de manche, écran quitté). */
export function stopVoice(): void {
  current?.stop();
}

/** Branche l'effet entre `input` et `out` ; rend de quoi le démonter. */
function connectEffect(
  ctx: AudioContext,
  effect: VoiceEffect,
  input: AudioNode,
  out: AudioNode,
): () => void {
  if (effect === 'robot') {
    const ring = ctx.createGain();
    ring.gain.value = 0;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = ROBOT_HZ;
    osc.connect(ring.gain);
    input.connect(ring).connect(out);
    osc.start();
    return () => {
      try {
        osc.stop();
      } catch {
        // Déjà arrêté.
      }
      osc.disconnect();
      ring.disconnect();
    };
  }
  if (effect === 'echo') {
    const delay = ctx.createDelay(1);
    delay.delayTime.value = ECHO_DELAY;
    const feedback = ctx.createGain();
    feedback.gain.value = ECHO_FEEDBACK;
    input.connect(out);
    input.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(out);
    return () => {
      delay.disconnect();
      feedback.disconnect();
    };
  }
  input.connect(out);
  return () => {};
}

/** Suivi d'une lecture : source déclarée tant qu'elle joue, `ended` à la fin. */
function track(stopSound: () => void, cleanup: () => void) {
  let live = true;
  const playing = () => live;
  let finish!: () => void;
  const ended = new Promise<void>((ok) => (finish = ok));
  const release = registerAudioSource(playing);
  const done = () => {
    if (!live) return;
    live = false;
    release();
    cleanup();
    if (current === playback) current = null;
    finish();
  };
  const playback: VoicePlayback = {
    playing,
    stop: () => {
      if (!live) return;
      stopSound();
      done();
    },
    ended,
  };
  current = playback;
  return { playback, done };
}

function fadeIn(ctx: AudioContext, env: GainNode, gain: number) {
  const t = ctx.currentTime + 0.01;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + FADE_IN);
  return t;
}

/** Lecture d'un son décodé, ramené au niveau commun. */
function playBuffer(
  ctx: AudioContext,
  out: AudioNode,
  buffer: AudioBuffer,
  effect: VoiceEffect,
): VoicePlayback {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
    buffer.getChannelData(i),
  );
  const level = normalizeGain(measureLevel(channels, buffer.sampleRate));
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = EFFECT_RATE[effect];
  const env = ctx.createGain();
  const t = fadeIn(ctx, env, level * effectGain(effect));
  source.connect(env);
  const unplug = connectEffect(ctx, effect, env, out);
  let tail = 0;
  const { playback, done } = track(
    () => {
      const now = ctx.currentTime;
      env.gain.cancelScheduledValues(now);
      env.gain.setValueAtTime(env.gain.value, now);
      env.gain.linearRampToValueAtTime(0, now + FADE_OUT);
      try {
        source.stop(now + FADE_OUT + 0.01);
      } catch {
        // Déjà arrêtée.
      }
    },
    () => {
      window.clearTimeout(tail);
      source.disconnect();
      env.disconnect();
      unplug();
    },
  );
  source.onended = () => {
    // L'écho continue un peu après la fin de la phrase.
    if (effect === 'echo') tail = window.setTimeout(done, ECHO_TAIL * 1000);
    else done();
  };
  source.start(t);
  return playback;
}

/**
 * Repli : un enregistrement que Web Audio ne sait pas décoder (certains Android) est lu par un
 * élément <audio>, à la vitesse de l'effet (sans garder la hauteur), branché sur l'effet et la
 * sortie commune au gain borné d'un son mis à niveau.
 */
async function playElement(
  audio: Blob,
  ctx: AudioContext | null,
  out: AudioNode | null,
  effect: VoiceEffect,
): Promise<VoicePlayback | null> {
  if (typeof Audio === 'undefined' || typeof URL.createObjectURL !== 'function') return null;
  const url = URL.createObjectURL(audio);
  const el = new Audio() as HTMLAudioElement & {
    preservesPitch?: boolean;
    webkitPreservesPitch?: boolean;
  };
  el.preload = 'auto';
  el.src = url;
  el.preservesPitch = false;
  el.webkitPreservesPitch = false;
  el.playbackRate = EFFECT_RATE[effect];
  let node: MediaElementAudioSourceNode | null = null;
  let env: GainNode | null = null;
  let unplug = () => {};
  if (ctx && out) {
    try {
      node = ctx.createMediaElementSource(el);
      env = ctx.createGain();
      fadeIn(ctx, env, UNMEASURED_GAIN * effectGain(effect));
      node.connect(env);
      unplug = connectEffect(ctx, effect, env, out);
    } catch {
      node = null;
      env = null;
    }
  }
  if (!env) el.volume = UNMEASURED_GAIN * VOLUME_GAIN[appVolume()];
  const { playback, done } = track(
    () => el.pause(),
    () => {
      unplug();
      env?.disconnect();
      node?.disconnect();
      el.removeAttribute('src');
      URL.revokeObjectURL(url);
    },
  );
  el.onended = done;
  el.onerror = done;
  try {
    await el.play();
    if (el.paused) throw new Error('Lecture non démarrée');
  } catch {
    done();
    return null;
  }
  return playback;
}

function blobBytes(audio: Blob): Promise<ArrayBuffer> {
  if (typeof audio.arrayBuffer === 'function') return audio.arrayBuffer();
  return new Response(audio).arrayBuffer();
}

/**
 * Rejoue la phrase enregistrée avec un effet. Arrête la voix précédente. Renvoie null si rien
 * ne peut être joué. À appeler pendant un appui (le navigateur l'exige pour le son).
 */
export async function playVoice(audio: Blob, effect: VoiceEffect): Promise<VoicePlayback | null> {
  stopVoice();
  let ctx: AudioContext | null;
  try {
    ctx = await runningAudioContext();
  } catch {
    ctx = null;
  }
  const out = ctx ? audioOutput() : null;
  let buffer: AudioBuffer | null = null;
  if (ctx && out) {
    try {
      buffer = await ctx.decodeAudioData(await blobBytes(audio));
    } catch {
      buffer = null;
    }
  }
  stopVoice();
  return ctx && out && buffer
    ? playBuffer(ctx, out, buffer, effect)
    : playElement(audio, ctx, out, effect);
}
