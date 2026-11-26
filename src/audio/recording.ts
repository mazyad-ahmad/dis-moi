import { useEffect, useRef, useState } from 'react';
import { getSettings } from '../data/settings';
import {
  audioOutput,
  FADE_IN,
  registerAudioSource,
  runningAudioContext,
  VOLUME_GAIN,
} from './context';
import { measureLevel, normalizeGain, TARGET_PEAK } from './level';

/**
 * Enregistrements du parent (sons des jeux créés, félicitations…) rejoués au niveau commun
 * (#121) : mesurés une fois, ramenés au même niveau, avec une montée douce, par la sortie
 * commune (plafond et volume de l'appli). Un seul enregistrement à la fois : en démarrer un
 * arrête le précédent (une félicitation s'efface devant le son d'une carte).
 */

/** Descente à l'arrêt, en secondes : pas de clic quand on coupe. */
const FADE_OUT = 0.03;

interface Prepared {
  buffer: AudioBuffer;
  gain: number;
}

/** Octets d'un Blob, même sur un navigateur sans `Blob.arrayBuffer` (anciens Android). */
function blobBytes(audio: Blob): Promise<ArrayBuffer> {
  if (typeof audio.arrayBuffer === 'function') return audio.arrayBuffer();
  return new Response(audio).arrayBuffer();
}

const prepared = new WeakMap<Blob, Promise<Prepared | null>>();

function prepare(ctx: AudioContext, audio: Blob): Promise<Prepared | null> {
  let p = prepared.get(audio);
  if (!p) {
    p = blobBytes(audio)
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
          buffer.getChannelData(i),
        );
        return { buffer, gain: normalizeGain(measureLevel(channels, buffer.sampleRate)) };
      })
      .catch(() => {
        // Un échec (contexte en veille, décodeur indisponible) n'est pas retenu : on réessaiera.
        prepared.delete(audio);
        return null;
      });
    prepared.set(audio, p);
  }
  return p;
}

/**
 * Gain d'un enregistrement que Web Audio n'a pas su décoder (#141) : on ne peut pas le mesurer,
 * on le borne comme la crête d'un son ramené au niveau commun.
 */
export const UNMEASURED_GAIN = TARGET_PEAK;

export interface RecordingPlayback {
  /** Arrête la lecture (avec une descente douce). */
  stop: () => void;
  /** Vrai tant que le son joue ; c'est aussi la source déclarée (voir `audioBusy(except)`). */
  playing: () => boolean;
  /** Résolue à la fin de la lecture, qu'elle aille au bout ou soit arrêtée. */
  ended: Promise<void>;
}

let current: RecordingPlayback | null = null;

/** Suivi commun d'une lecture : déclarée comme source tant qu'elle joue, `ended` à la fin. */
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
  const playback: RecordingPlayback = {
    playing,
    stop: () => {
      if (!live) return;
      stopSound();
      done();
    },
    ended,
  };
  return { playback, done };
}

/** Lecture décodée par Web Audio : mesurée et ramenée au niveau commun. */
function playBuffer(ctx: AudioContext, out: AudioNode, ready: Prepared): RecordingPlayback {
  const source = ctx.createBufferSource();
  source.buffer = ready.buffer;
  const env = ctx.createGain();
  const t = ctx.currentTime + 0.01;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(ready.gain, t + FADE_IN);
  source.connect(env).connect(out);
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
    () => {},
  );
  source.onended = () => {
    env.disconnect();
    done();
  };
  source.start(t);
  return playback;
}

/**
 * Repli (#141) : lecture par un élément <audio>, qui accepte les formats du téléphone que
 * `decodeAudioData` refuse (certains Android). Branché si possible sur la sortie commune
 * (plafond et volume de l'appli), sinon volume réglé sur l'élément lui-même.
 */
async function playElement(
  audio: Blob,
  ctx: AudioContext | null,
  out: AudioNode | null,
): Promise<RecordingPlayback | null> {
  if (typeof Audio === 'undefined' || typeof URL.createObjectURL !== 'function') return null;
  const url = URL.createObjectURL(audio);
  const el = new Audio();
  el.preload = 'auto';
  el.src = url;
  let env: GainNode | null = null;
  let node: MediaElementAudioSourceNode | null = null;
  if (ctx && out) {
    try {
      node = ctx.createMediaElementSource(el);
      env = ctx.createGain();
      const t = ctx.currentTime + 0.01;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(UNMEASURED_GAIN, t + FADE_IN);
      node.connect(env).connect(out);
    } catch {
      node = null;
      env = null;
    }
  }
  if (!env) el.volume = UNMEASURED_GAIN * VOLUME_GAIN[getSettings().volume];

  // L'URL n'est libérée qu'à la fin de la lecture, jamais avant.
  const { playback, done } = track(
    () => el.pause(),
    () => {
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
    // Format illisible, ou lecture refusée par le navigateur.
    done();
    return null;
  }
  return playback;
}

/**
 * Joue un enregistrement du parent au niveau normal de l'appli. Arrête l'enregistrement
 * précédent. Renvoie null si rien ne peut être joué (fichier illisible, lecture refusée).
 * À appeler pendant un appui : le navigateur l'exige pour démarrer le son.
 */
export async function playRecording(audio: Blob): Promise<RecordingPlayback | null> {
  current?.stop();
  let ctx: AudioContext | null;
  try {
    ctx = await runningAudioContext();
  } catch {
    ctx = null;
  }
  const out = ctx ? audioOutput() : null;
  const ready = ctx && out ? await prepare(ctx, audio) : null;
  current?.stop();
  const playback =
    ctx && out && ready ? playBuffer(ctx, out, ready) : await playElement(audio, ctx, out);
  if (playback?.playing()) {
    current?.stop();
    current = playback;
  }
  return playback;
}

/**
 * Bouton lecture / arrêt d'un enregistrement ; coupé quand l'écran est quitté.
 * `failed` : le dernier appui n'a rien pu jouer (#141), pour l'afficher au parent.
 */
export function useRecording(audio: Blob | undefined) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const playback = useRef<RecordingPlayback | null>(null);
  // Un appui pendant le chargement l'annule.
  const request = useRef(0);

  useEffect(
    () => () => {
      request.current++;
      playback.current?.stop();
      playback.current = null;
      setPlaying(false);
      setFailed(false);
    },
    [audio],
  );

  const toggle = () => {
    const id = ++request.current;
    if (playing) {
      playback.current?.stop();
      playback.current = null;
      setPlaying(false);
      return;
    }
    if (!audio) return;
    setPlaying(true);
    setFailed(false);
    void playRecording(audio).then((p) => {
      if (id !== request.current) return p?.stop();
      if (!p) {
        setPlaying(false);
        setFailed(true);
        return;
      }
      playback.current = p;
      void p.ended.then(() => {
        if (playback.current !== p) return;
        playback.current = null;
        setPlaying(false);
      });
    });
  };

  return { playing, failed, toggle };
}
