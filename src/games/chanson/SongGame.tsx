import { useMemo } from 'react';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { IconPause, IconPlay } from '../../components/icons';
import { ParentBlock } from '../../components/ParentBlock';
import { clock } from '../format';
import { Replayable } from '../Replayable';
import { draw } from '../shuffle';
import { useRoundSetting, useRounds } from '../useRounds';
import { EXTRACT_SECONDS, SONGS, type Song } from './songs';
import { useMelody } from './useMelody';

/** Hauteurs de la forme d'onde décorative (maquette Musique). */
const BARS = [18, 38, 56, 30, 46, 64, 40, 22, 48, 34, 54, 26, 14];

function Player({ song }: { song: Song }) {
  const { state, elapsed, length, toggle } = useMelody(song);
  const progress = length ? elapsed / length : 0;
  const playing = state === 'playing';
  return (
    <section className="song-player" aria-label="Extrait">
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
          playing ? 'Pause' : state === 'ended' ? 'Réécouter l’extrait' : 'Écouter l’extrait'
        }
      >
        {playing ? <IconPause size={40} /> : <IconPlay size={40} />}
      </button>
      <span role="status">
        {state === 'unavailable'
          ? 'Le son n’est pas disponible sur cet appareil.'
          : `Extrait de ${EXTRACT_SECONDS} secondes · ${clock(elapsed)}`}
      </span>
    </section>
  );
}

function SongSession({ onReplay }: { onReplay: () => void }) {
  const wanted = useRoundSetting();
  const songs = useMemo(() => draw(SONGS, wanted), [wanted]);
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
      {/* key : nouvelle manche = lecteur et réponse remis à zéro. */}
      <Player key={song.id} song={song} />
      <ParentBlock key={`p-${song.id}`} hidden={song.title}>
        Indice : {song.hint}
      </ParentBlock>
      <div className="spacer" />
      <AnswerBar onSkip={() => answer(false)} onFound={() => answer(true)} skipLabel="Pas encore" />
    </main>
  );
}

export function SongGame() {
  return <Replayable>{(replay) => <SongSession onReplay={replay} />}</Replayable>;
}
