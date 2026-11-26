import { useEffect, useRef, useState } from 'react';
import { INSTRUMENTS, type Timbre } from '../../audio/instruments';
import { Button } from '../../components/Button';
import { IconPause, IconPlay } from '../../components/icons';
import { clock } from '../format';
import type { Song } from './songs';
import { useMelody } from './useMelody';
import './sing.css';

interface Props {
  song: Song;
  timbre: Timbre;
  drone: boolean;
  /** Appelé quand on ouvre (true) ou referme (false) : l'extrait laisse alors la place. */
  onSinging: (singing: boolean) => void;
}

/**
 * « Chanter ensemble » (#117) : une fois la chanson trouvée, l'air en entier au synthétiseur,
 * avec les paroles du premier couplet quand la carte en a (domaine public seulement).
 * C'est un bonus : la manche suivante reste accessible, et passer à la suivante coupe l'air.
 */
export function SingAlong({ song, timbre, drone, onSinging }: Props) {
  const [open, setOpen] = useState(false);
  const { state, elapsed, length, toggle, stop } = useMelody(
    song,
    false,
    timbre,
    drone,
    'extrait',
    0,
    true,
  );
  const lyricsRef = useRef<HTMLElement>(null);
  const playRef = useRef<HTMLButtonElement>(null);
  const playing = state === 'playing';

  // Le bouton « Chanter ensemble » disparaît : TalkBack passe aux paroles (ou au lecteur).
  useEffect(() => {
    if (open) (lyricsRef.current ?? playRef.current)?.focus();
  }, [open]);

  if (!open)
    return (
      <Button
        variant="secondary"
        block
        className="sing__open round-in"
        icon={<span aria-hidden="true">🎤</span>}
        onClick={() => {
          setOpen(true);
          onSinging(true);
          // Lancé dans l'appui lui-même : le navigateur autorise le son.
          void toggle();
        }}
      >
        Chanter ensemble
      </Button>
    );

  return (
    <section className="song-player sing round-in" aria-label="Chanter ensemble">
      <button
        ref={playRef}
        type="button"
        className="song-player__play"
        onClick={() => void toggle()}
        aria-label={playing ? 'Pause' : 'Jouer l’air en entier'}
      >
        {playing ? <IconPause size={40} /> : <IconPlay size={40} />}
      </button>
      <span role="status">
        {state === 'unavailable'
          ? 'Le son n’est pas disponible sur cet appareil : chantez sans la musique !'
          : `Air en entier · ${clock(elapsed)} / ${clock(length)}`}
      </span>
      <span className="song-player__timbre">
        <span aria-hidden="true">{INSTRUMENTS[timbre].emoji}</span> Joué {INSTRUMENTS[timbre].label}
      </span>
      {song.lyrics ? (
        <section ref={lyricsRef} className="sing__lyrics" aria-label="Paroles" tabIndex={-1}>
          {song.lyrics.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </section>
      ) : (
        <p className="sing__hum">Pas de paroles pour cet air : fredonnez-le ensemble !</p>
      )}
      <Button
        variant="ghost"
        onClick={() => {
          void stop();
          setOpen(false);
          onSinging(false);
        }}
      >
        Revenir à l’extrait
      </Button>
    </section>
  );
}
