import { useEffect, useRef, useState, type ComponentProps, type RefObject } from 'react';
import { playSound } from '../../audio/sounds';
import type { Player } from '../../data/db';
import { DrawingError, keepDrawing, updateDrawingImage } from '../../data/drawings';
import { listActivePlayers } from '../../data/players';
import { seenOf, useMarkSeen } from '../../data/seen';
import { getSettings } from '../../data/settings';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { ReadAloud } from '../../components/ReadAloud';
import { IconRefresh, IconTimer } from '../../components/icons';
import { vibrate } from '../../pwa/haptics';
import { clock } from '../format';
import { Replayable } from '../Replayable';
import { useSaved, useSavedDraw } from '../session';
import { orderByLevel, type Level } from '../levels';
import { modeDrawSeconds } from '../modes';
import { nextForLevel } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { useTurns } from '../useTurns';
import { type DrawingCanvasHandle } from './DrawingCanvas';
import { DrawingPad } from './DrawingPad';
import { useCountdown } from './useCountdown';
import { DRAW_LEVELS, DRAW_WORDS } from './words';

interface DrawingProps {
  gameId?: string;
  category?: string;
  title?: string;
  /** Banque de mots (par défaut celle de « Dessine ça »). */
  words?: readonly string[];
  /** Niveau par âge d'un mot (#40) ; sans niveau, le mot convient à tous. */
  levelOf?: (word: string) => Level | undefined;
}

function DrawingSession({
  onReplay,
  gameId = 'dessin',
  category = 'Dessin',
  title = 'Dessine ça',
  words: bank = DRAW_WORDS,
  levelOf = (word) => DRAW_LEVELS.get(word),
}: DrawingProps & { onReplay: () => void }) {
  const turns = useTurns(gameId);
  // Tirage figé pour la partie (la banque peut venir d'une requête qui se met à jour),
  // retrouvé après un rafraîchissement. Les mots pas encore dessinés d'abord (#55).
  const [seen] = useState(() => seenOf(gameId, bank, (w) => w));
  const words = useSavedDraw(
    gameId,
    'draw',
    bank,
    () => orderByLevel(bank, getSettings().gameLevel, levelOf, undefined, seen),
    (w) => w,
  );
  const setting = useRoundSetting();
  // Pas plus de manches que de mots (jeux créés avec peu de mots).
  const { round, rounds, stars, finished, answer, team, teams } = useRounds(
    gameId,
    Math.min(setting, words.length),
    turns?.order,
  );
  // Index du mot affiché : avance à chaque manche et avec « Autre mot ».
  const [index, setIndex] = useSaved(
    gameId,
    'index',
    () => 0,
    (i) => (Number.isInteger(i) && (i as number) >= 0 ? (i as number) : undefined),
  );
  // Chacun son tour (#38) : mots montrés dans l'ordre, chacun tiré au niveau de l'enfant
  // de la manche (« Autre mot » aussi) ; le dernier est le mot affiché.
  const [shown, setShown] = useSaved<string[]>(
    gameId,
    'shown',
    () => (turns ? [nextForLevel(words, turns.levelAt(1), levelOf, [], undefined, seen)!] : []),
    (saved) =>
      Array.isArray(saved) && saved.every((w) => words.includes(w as string))
        ? (saved as string[])
        : undefined,
  );
  // Durée réglée dans l'espace Parent (aucun minuteur en mode Coucher), figée pour la partie.
  const [seconds] = useState(() =>
    modeDrawSeconds(getSettings().drawSeconds, getSettings().gameMode),
  );

  const word = turns && shown.length ? shown[shown.length - 1] : words[index % words.length];
  useMarkSeen(gameId, finished ? undefined : word);

  if (finished)
    return <GameResult stars={stars} rounds={rounds} teams={teams} onReplay={onReplay} />;

  const heading = { round, rounds, stars, category, title, player: turns?.playerAt(round), team };
  if (turns && shown.length) {
    const show = (forRound: number) =>
      setShown([
        ...shown,
        nextForLevel(words, turns.levelAt(forRound), levelOf, shown, undefined, seen)!,
      ]);
    return (
      <DrawingBoard
        heading={heading}
        word={word}
        turn={shown.length}
        seconds={seconds}
        onOtherWord={words.length > 1 ? () => show(round) : undefined}
        onAnswer={(found) => {
          if (round < rounds) show(round + 1);
          answer(found);
        }}
      />
    );
  }

  return (
    <DrawingBoard
      heading={heading}
      word={word}
      turn={index}
      seconds={seconds}
      onOtherWord={() => setIndex(index + 1)}
      onAnswer={(found) => {
        setIndex(index + 1);
        answer(found);
      }}
    />
  );
}

/**
 * « Garder » (#52) : le dessin part dans la galerie, avec le mot, la date et l'enfant.
 * Si l'enfant continue après, un nouvel appui met à jour le même dessin ; après « Tout
 * effacer », c'est un nouveau dessin.
 */
function KeepButton({
  word,
  strokes,
  player,
  canvas,
}: {
  word: string;
  strokes: number;
  player?: Player;
  canvas: RefObject<DrawingCanvasHandle | null>;
}) {
  const [kept, setKept] = useState<{ id: number; strokes: number } | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'full' | 'failed'>('idle');
  // « Tout effacer » puis un nouveau dessin : c'est un autre dessin, gardé à part.
  if (!strokes && kept) setKept(null);
  if (!strokes) return null;
  const done = kept?.strokes === strokes;

  async function keep() {
    setState('busy');
    try {
      const image = await canvas.current?.snapshot();
      if (!image) throw new Error('image');
      if (kept) await updateDrawingImage(kept.id, image);
      const id =
        kept?.id ??
        (await keepDrawing({
          word,
          image,
          playerIds: player ? [player.id] : (await listActivePlayers()).map((p) => p.id),
        }));
      setKept({ id, strokes });
      setState('idle');
    } catch (e) {
      setState(e instanceof DrawingError ? 'full' : 'failed');
    }
  }

  const label =
    state === 'full'
      ? 'Galerie pleine'
      : state === 'failed'
        ? 'Pas gardé'
        : done
          ? 'Gardé'
          : 'Garder';
  return (
    <button
      type="button"
      className="btn btn--secondary keep-btn"
      disabled={done || state === 'busy' || state === 'full'}
      onClick={() => void keep()}
    >
      {label}
    </button>
  );
}

interface BoardProps {
  heading: Omit<ComponentProps<typeof GameHeader>, 'aside'>;
  word: string;
  /** Change à chaque nouveau mot : relance le minuteur. */
  turn: unknown;
  /** Durée du minuteur, en secondes ; 0 : pas de minuteur (mode Coucher, #42). */
  seconds: number;
  /** « Autre mot » : absent, le bouton n'est pas proposé. */
  onOtherWord?: () => void;
  onAnswer: (found: boolean) => void;
}

/**
 * Une manche de dessin : mot, minuteur, zone de dessin et boutons.
 * Partagée par « Dessine ça », les mots à dessiner créés et le Grand Jeu (#41).
 */
export function DrawingBoard({ heading, word, turn, seconds, onOtherWord, onAnswer }: BoardProps) {
  const canvas = useRef<DrawingCanvasHandle>(null);
  const timed = seconds > 0;
  const left = useCountdown(Math.max(0, seconds), turn);
  const timeUp = timed && left <= 0;
  // Double vibration quand le temps est écoulé : le dessin est figé, l'enfant a fini.
  useEffect(() => {
    if (timeUp) vibrate('timeUp');
  }, [timeUp]);
  // Fin du minuteur : une clochette douce, le parent valide le dessin.
  useEffect(() => {
    if (timeUp) void playSound('timer');
  }, [timeUp]);

  const otherWord = () => {
    canvas.current?.clear();
    onOtherWord?.();
  };
  const next = (found: boolean) => {
    canvas.current?.clear();
    onAnswer(found);
  };

  return (
    <main className="screen screen--tight">
      <GameHeader
        {...heading}
        aside={
          timed && (
            <span
              className={`timer${timeUp ? ' timer--done' : ''}`}
              role="timer"
              aria-label={timeUp ? 'Temps écoulé' : `${left} secondes restantes`}
            >
              <IconTimer size={20} />
              {clock(left)}
            </span>
          )
        }
      />

      <section className="word-card" aria-label="Mot à dessiner">
        {/* key : chaque nouveau mot entre en douceur. */}
        <div key={`${String(turn)}:${word}`} className="round-in">
          <span className="word-card__label">Le parent lit à voix haute</span>
          <strong className="word-card__word">{word}</strong>
          <ReadAloud text={word} />
        </div>
        {onOtherWord && (
          <button
            type="button"
            className="icon-btn word-card__other"
            onClick={otherWord}
            aria-label="Autre mot"
          >
            <IconRefresh size={20} />
          </button>
        )}
      </section>

      <DrawingPad
        ref={canvas}
        disabled={timeUp}
        corner={(strokes) => (
          <KeepButton
            key={`${String(turn)}:${word}`}
            word={word}
            strokes={strokes}
            player={heading.player}
            canvas={canvas}
          />
        )}
        hint={
          timeUp ? 'Temps écoulé ! Le parent valide le dessin.' : "L'enfant dessine avec le doigt"
        }
      />

      <AnswerBar onSkip={() => next(false)} onFound={() => next(true)} foundLabel="C'est fini" />
    </main>
  );
}

export function DrawingGame(props: DrawingProps = {}) {
  return <Replayable>{(replay) => <DrawingSession {...props} onReplay={replay} />}</Replayable>;
}
