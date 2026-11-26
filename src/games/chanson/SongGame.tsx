import { useState } from 'react';
import { INSTRUMENTS, randomTimbre, type Timbre } from '../../audio/instruments';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { IconPause, IconPlay } from '../../components/icons';
import { ParentBlock } from '../../components/ParentBlock';
import { clock } from '../format';
import { firstLetterHint, writtenHints } from '../hints';
import { ChoiceBoard } from '../choices/ChoiceBoard';
import { useChoices } from '../choices/useChoices';
import { songOption } from '../choices/choices';
import { Replayable } from '../Replayable';
import { useSavedDraw } from '../session';
import { seenOf, useMarkSeen } from '../../data/seen';
import { getSettings } from '../../data/settings';
import { drawForLevel } from '../levels';
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns } from '../useTurns';
import { EXTRACT_SECONDS, SONGS, type Song } from './songs';
import { useMelody } from './useMelody';

/** Hauteurs de la forme d'onde décorative (maquette Musique). */
const BARS = [18, 38, 56, 30, 46, 64, 40, 22, 48, 34, 54, 26, 14];

interface PlayerProps {
  song: Song;
  slow: boolean;
  timbre: Timbre;
  drone: boolean;
  onDrone: (on: boolean) => void;
}

function Player({ song, slow, timbre, drone, onDrone }: PlayerProps) {
  const { state, elapsed, length, toggle } = useMelody(song, slow, timbre, drone);
  const instrument = INSTRUMENTS[timbre];
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
      <div className="song-player__options">
        <span className="song-player__timbre">
          <span aria-hidden="true">{instrument.emoji}</span> Joué {instrument.label}
        </span>
        {/* Accompagnement facultatif (#46) : une note grave tenue sous l'air. */}
        <button
          type="button"
          className="player-toggle"
          aria-pressed={drone}
          onClick={() => onDrone(!drone)}
        >
          <span className="player-toggle__mark" aria-hidden="true">
            {drone ? '✓' : ''}
          </span>
          <span>Accompagnement</span>
        </button>
      </div>
    </section>
  );
}

/** Indice « air ralenti » : le parent fait réécouter l'extrait plus lentement. */
const SLOW_HINT = 'l’air passe au ralenti, fais-le réécouter';

/**
 * Une manche : lecteur (instrument tiré au hasard, accompagnement facultatif) et indices en
 * escalier (écrits, air ralenti, première lettre).
 * Avec `pool` et « Répondre en montrant » (#123), l'enfant touche la chanson parmi des images.
 */
export function SongRound({ song, pool }: { song: Song; pool?: readonly Song[] }) {
  const choices = useChoices(pool && songOption(song), pool?.map(songOption));
  const written = writtenHints(song);
  const letter = firstLetterHint(song.title);
  const hints = [...written, SLOW_HINT, ...(letter ? [letter] : [])];
  const [shown, setShown] = useState(1);
  // Un instrument tiré au hasard pour la manche, gardé pour l'air ralenti (#46).
  const [timbre] = useState(randomTimbre);
  const [drone, setDrone] = useState(false);
  const slow = shown > written.length;
  return (
    <>
      {/* key : le lecteur repart de zéro au ralenti ou quand l'accompagnement change. */}
      <Player
        key={`${slow ? 'lent' : 'normal'}-${drone ? 'bourdon' : 'seul'}`}
        song={song}
        slow={slow}
        timbre={timbre}
        drone={drone}
        onDrone={setDrone}
      />
      {choices && <ChoiceBoard options={choices} answer={song.id} />}
      <ParentBlock hidden={song.title} hints={hints} openHints={1} onHint={setShown} />
    </>
  );
}

function SongSession({ onReplay }: { onReplay: () => void }) {
  const wanted = useRoundSetting();
  const turns = useTurns('chanson');
  const songs = useSavedDraw(
    'chanson',
    'draw',
    SONGS,
    () => {
      // Les chansons pas encore entendues d'abord (#55).
      const seen = seenOf('chanson', SONGS, (s) => s.id);
      const levelOf = (s: (typeof SONGS)[number]) => s.level;
      return turns
        ? drawForTurns(
            SONGS,
            turns.levels(Math.min(wanted, SONGS.length)),
            levelOf,
            undefined,
            seen,
          )
        : drawForLevel(SONGS, wanted, getSettings().gameLevel, levelOf, undefined, seen);
    },
    (s) => s.id,
  );
  const { round, rounds, stars, finished, answer, team, teams } = useRounds(
    'chanson',
    songs.length,
    turns?.order,
  );
  const song = songs[round - 1];
  useMarkSeen('chanson', finished ? undefined : song.id);

  if (finished)
    return <GameResult stars={stars} rounds={rounds} teams={teams} onReplay={onReplay} />;

  return (
    <main className="screen">
      <GameHeader
        round={round}
        rounds={rounds}
        stars={stars}
        category="Musique"
        title="Quelle chanson ?"
        player={turns?.playerAt(round)}
        team={team}
      />
      {/* key : nouvelle manche = lecteur, indices et réponse remis à zéro. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <SongRound key={song.id} song={song} pool={SONGS} />
      </TurnPlayer.Provider>
      <div className="spacer" />
      <AnswerBar onSkip={() => answer(false)} onFound={() => answer(true)} skipLabel="Pas encore" />
    </main>
  );
}

export function SongGame() {
  return <Replayable>{(replay) => <SongSession onReplay={replay} />}</Replayable>;
}
