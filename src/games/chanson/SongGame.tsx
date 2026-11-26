import { useState } from 'react';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { IconPause, IconPlay } from '../../components/icons';
import { ParentBlock } from '../../components/ParentBlock';
import { clock } from '../format';
import { firstLetterHint, writtenHints } from '../hints';
import { Replayable } from '../Replayable';
import { useSavedDraw } from '../session';
import { draw } from '../shuffle';
import { useRoundSetting, useRounds } from '../useRounds';
import { EXTRACT_SECONDS, SONGS, type Song } from './songs';
import { useMelody } from './useMelody';

/** Hauteurs de la forme d'onde décorative (maquette Musique). */
const BARS = [18, 38, 56, 30, 46, 64, 40, 22, 48, 34, 54, 26, 14];

function Player({ song, slow }: { song: Song; slow: boolean }) {
  const { state, elapsed, length, toggle } = useMelody(song, slow);
  const progress = length ? elapsed / length : 0;
  const playing = state === 'playing';
  return (
    <section className="song-player round-in" aria-label="Extrait">
      <div className="song-player__wave" aria-hidden="true">
        {BARS.map((h, i) => (
          <span
            key={i}
            style={{ height: h }}
            className={i / BARS.length < progress ? 'is-played' : undefined}
          />
        ))}
      </div>
      <button
        type="button"
        className="song-player__play"
        onClick={() => void toggle()}
        aria-label={
          playing
            ? 'Pause'
            : slow
              ? 'Écouter l’extrait ralenti'
              : state === 'ended'
                ? 'Réécouter l’extrait'
                : 'Écouter l’extrait'
        }
      >
        {playing ? <IconPause size={40} /> : <IconPlay size={40} />}
      </button>
      <span role="status">
        {state === 'unavailable'
          ? 'Le son n’est pas disponible sur cet appareil.'
          : slow
            ? `Extrait ralenti · ${clock(elapsed)}`
            : `Extrait de ${EXTRACT_SECONDS} secondes · ${clock(elapsed)}`}
      </span>
    </section>
  );
}

/** Indice « air ralenti » : le parent fait réécouter l'extrait plus lentement. */
const SLOW_HINT = 'l’air passe au ralenti, fais-le réécouter';

/** Une manche : lecteur et indices en escalier (écrits, air ralenti, première lettre). */
function SongRound({ song }: { song: Song }) {
  const written = writtenHints(song);
  const letter = firstLetterHint(song.title);
  const hints = [...written, SLOW_HINT, ...(letter ? [letter] : [])];
  const [shown, setShown] = useState(1);
  const slow = shown > written.length;
  return (
    <>
      {/* key : le lecteur repart de zéro quand il passe au ralenti. */}
      <Player key={slow ? 'lent' : 'normal'} song={song} slow={slow} />
      <ParentBlock hidden={song.title} hints={hints} openHints={1} onHint={setShown} />
    </>
  );
}

function SongSession({ onReplay }: { onReplay: () => void }) {
  const wanted = useRoundSetting();
  const songs = useSavedDraw(
    'chanson',
    'draw',
    SONGS,
    () => draw(SONGS, wanted),
    (s) => s.id,
  );
  const { round, rounds, stars, finished, answer } = useRounds('chanson', songs.length);

  if (finished) return <GameResult stars={stars} rounds={rounds} onReplay={onReplay} />;

  const song = songs[round - 1];
  return (
    <main className="screen">
      <GameHeader
        round={round}
        rounds={rounds}
        stars={stars}
        category="Musique"
        title="Quelle chanson ?"
      />
      {/* key : nouvelle manche = lecteur, indices et réponse remis à zéro. */}
      <SongRound key={song.id} song={song} />
      <div className="spacer" />
      <AnswerBar onSkip={() => answer(false)} onFound={() => answer(true)} skipLabel="Pas encore" />
    </main>
  );
}

export function SongGame() {
  return <Replayable>{(replay) => <SongSession onReplay={replay} />}</Replayable>;
}
