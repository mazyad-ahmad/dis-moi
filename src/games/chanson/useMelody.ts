import { useEffect, useMemo, useState } from 'react';
import type { Timbre } from '../../audio/instruments';
import { extractLength, parseMelody, schedule, tonic } from './melody';
import { audioAvailable, MelodyPlayer } from './player';
import { SLOW_TEMPO, type Song } from './songs';
import { variantSchedule, type Variant } from './variants';

export type PlayState = 'idle' | 'playing' | 'paused' | 'ended' | 'unavailable';

/**
 * Lecture de l'extrait d'une chanson : état, progression, lecture / pause.
 * Ralenti (indice) : les mêmes notes, jouées plus lentement.
 * `timbre` : instrument de l'air ; `drone` : accompagnement (bourdon sur la tonique).
 * `variant` et `step` : façon d'écouter (#47) et palier de « Petit à petit ».
 * `full` : l'air en entier, sans couper à la durée de l'extrait (« Chanter ensemble », #117).
 */
export function useMelody(
  song: Song,
  slow = false,
  timbre?: Timbre,
  drone = false,
  variant: Variant = 'extrait',
  step = 0,
  full = false,
) {
  const player = useMemo(() => {
    const notes = parseMelody(song.melody);
    const events = full
      ? schedule(notes, song.bpm * (slow ? SLOW_TEMPO : 1), Infinity)
      : variantSchedule(notes, song.bpm, variant, step, slow);
    return new MelodyPlayer(events, extractLength(events), {
      timbre,
      drone: (drone && tonic(notes)) || undefined,
    });
  }, [song, slow, timbre, drone, variant, step, full]);
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

  /** Arrête et revient au début. */
  async function stop() {
    await player.stop();
    setState('idle');
    setElapsed(0);
  }

  return { state, elapsed, length: player.length, toggle, stop };
}
