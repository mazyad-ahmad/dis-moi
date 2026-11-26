import { useEffect, useRef, useState } from 'react';
import {
  nextTilt,
  NO_SENSOR_MS,
  poseOf,
  screenFacing,
  sideOf,
  TILT_START,
  type TiltGesture,
} from './tilt';

export type TiltStatus = 'waiting' | 'live' | 'absent';

export interface Tilt {
  /** En attente d'une première mesure, mesures reçues, ou rien après `NO_SENSOR_MS`. */
  status: TiltStatus;
  /** Côté du téléphone tenu en paysage, s'il est connu. */
  side?: 'left' | 'right';
}

/**
 * Écoute l'inclinaison tant que `on` est vrai et signale chaque geste à `onGesture`.
 * Les mesures restent dans la page : rien n'est gardé ni envoyé.
 */
export function useTilt(on: boolean, onGesture: (gesture: TiltGesture) => void): Tilt {
  const [tilt, setTilt] = useState<Tilt>({ status: 'waiting' });
  const handler = useRef(onGesture);
  useEffect(() => {
    handler.current = onGesture;
  }, [onGesture]);

  useEffect(() => {
    if (!on) return;
    let state = TILT_START;
    let seen = false;
    const listener = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      if (!seen) {
        seen = true;
        setTilt((t) => ({ ...t, status: 'live' }));
      }
      const side = sideOf(e.gamma);
      if (side) setTilt((t) => (t.side === side ? t : { ...t, side }));
      const next = nextTilt(state, poseOf(screenFacing(e.beta, e.gamma)), performance.now());
      state = next.state;
      if (next.gesture) handler.current(next.gesture);
    };
    window.addEventListener('deviceorientation', listener);
    const timer = window.setTimeout(() => {
      if (!seen) setTilt((t) => ({ ...t, status: 'absent' }));
    }, NO_SENSOR_MS);
    return () => {
      window.removeEventListener('deviceorientation', listener);
      window.clearTimeout(timer);
    };
  }, [on]);

  return tilt;
}

type Lockable = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

/**
 * Essaie de passer l'écran en paysage pendant le jeu, puis le rend. Beaucoup de navigateurs
 * refusent hors plein écran : le mot est alors tourné par le style (voir `tete.css`).
 */
export function useLandscape(on: boolean): void {
  useEffect(() => {
    if (!on || typeof screen === 'undefined') return;
    const orientation = screen.orientation as Lockable | undefined;
    if (typeof orientation?.lock !== 'function') return;
    let active = true;
    const unlock = () => {
      try {
        orientation.unlock?.();
      } catch {
        // Rien à rendre.
      }
    };
    orientation
      .lock('landscape')
      .then(() => {
        // Écran quitté avant la fin de la demande : on rend tout de suite.
        if (!active) unlock();
      })
      .catch(() => undefined);
    return () => {
      active = false;
      unlock();
    };
  }, [on]);
}
