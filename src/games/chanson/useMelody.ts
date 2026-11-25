import { useEffect, useMemo, useState } from 'react';
import { extractLength, parseMelody, schedule } from './melody';
import { audioAvailable, MelodyPlayer } from './player';
import { EXTRACT_SECONDS, type Song } from './songs';

export type PlayState = 'idle' | 'playing' | 'paused' | 'ended' | 'unavailable';

/** Lecture de l'extrait d'une chanson : état, progression, lecture / pause. */
export function useMelody(song: Song) {
  const player = useMemo(() => {
    const events = schedule(parseMelody(song.melody), song.bpm, EXTRACT_SECONDS);
    return new MelodyPlayer(events, extractLength(events));
  }, [song]);
  const [state, setState] = useState<PlayState>('idle');
  const [elapsed, setElapsed] = useState(0);

  // Coupe le son quand on change de manche ou qu'on quitte le jeu.
  useEffect(() => () => void player.stop(), [player]);

  // Progression pendant la lecture.
  useEffect(() => {
    if (state !== 'playing') return;
    let raf = 0;
    const tick = () => {
      setElapsed(player.elapsed);
      if (player.ended) {
        setState('ended');
        void player.stop();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [player, state]);

  async function toggle() {
    if (state === 'playing') {
      await player.pause();
      setState('paused');
      return;
    }
    if (!audioAvailable()) {
      setState('unavailable');
      return;
    }
    if (state === 'ended') setElapsed(0);
    try {
      await player.play();
      setState('playing');
    } catch {
      setState('unavailable');
    }
  }

  return { state, elapsed, length: player.length, toggle };
}
