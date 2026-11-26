import { useEffect, useRef, useState } from 'react';
import { audioOutput, FADE_IN, registerAudioSource, runningAudioContext } from './context';
import { measureLevel, normalizeGain } from './level';

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

const prepared = new WeakMap<Blob, Promise<Prepared | null>>();

function prepare(ctx: AudioContext, audio: Blob): Promise<Prepared | null> {
  let p = prepared.get(audio);
  if (!p) {
    p = audio
      .arrayBuffer()
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
          buffer.getChannelData(i),
        );
        return { buffer, gain: normalizeGain(measureLevel(channels, buffer.sampleRate)) };
      })
      .catch(() => null);
    prepared.set(audio, p);
  }
  return p;
}

export interface RecordingPlayback {
  /** Arrête la lecture (avec une descente douce). */
  stop: () => void;
  /** Vrai tant que le son joue ; c'est aussi la source déclarée (voir `audioBusy(except)`). */
  playing: () => boolean;
  /** Résolue à la fin de la lecture, qu'elle aille au bout ou soit arrêtée. */
  ended: Promise<void>;
}

let current: RecordingPlayback | null = null;

/**
 * Joue un enregistrement du parent au niveau normal de l'appli. Arrête l'enregistrement
 * précédent. Renvoie null si rien ne peut être joué (pas de Web Audio, fichier illisible).
 * À appeler de préférence pendant un appui (le navigateur l'exige pour démarrer le son).
 */
export async function playRecording(audio: Blob): Promise<RecordingPlayback | null> {
  current?.stop();
  let ctx: AudioContext | null;
  try {
    ctx = await runningAudioContext();
  } catch {
    return null;
  }
  const out = audioOutput();
  if (!ctx || !out) return null;
  const ready = await prepare(ctx, audio);
  if (!ready) return null;
  current?.stop();

  const source = ctx.createBufferSource();
  source.buffer = ready.buffer;
  const env = ctx.createGain();
  const t = ctx.currentTime + 0.01;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(ready.gain, t + FADE_IN);
  source.connect(env).connect(out);

  let live = true;
  const playing = () => live;
  let finish!: () => void;
  const ended = new Promise<void>((ok) => (finish = ok));
  const release = registerAudioSource(playing);
  const done = () => {
    if (!live) return;
    live = false;
    release();
    if (current === playback) current = null;
    finish();
  };
  source.onended = () => {
    env.disconnect();
    done();
  };
  const playback: RecordingPlayback = {
    playing,
    stop: () => {
      if (!live) return;
      const now = ctx.currentTime;
      env.gain.cancelScheduledValues(now);
      env.gain.setValueAtTime(env.gain.value, now);
      env.gain.linearRampToValueAtTime(0, now + FADE_OUT);
      try {
        source.stop(now + FADE_OUT + 0.01);
      } catch {
        // Déjà arrêtée.
      }
      done();
    },
    ended,
  };
  source.start(t);
  current = playback;
  return playback;
}

/** Bouton lecture / arrêt d'un enregistrement ; coupé quand l'écran est quitté. */
export function useRecording(audio: Blob | undefined) {
  const [playing, setPlaying] = useState(false);
  const playback = useRef<RecordingPlayback | null>(null);
  // Un appui pendant le chargement l'annule.
  const request = useRef(0);

  useEffect(
    () => () => {
      request.current++;
      playback.current?.stop();
      playback.current = null;
      setPlaying(false);
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
    void playRecording(audio).then((p) => {
      if (id !== request.current) return p?.stop();
      if (!p) return setPlaying(false);
      playback.current = p;
      void p.ended.then(() => {
        if (playback.current !== p) return;
        playback.current = null;
        setPlaying(false);
      });
    });
  };

  return { playing, toggle };
}
