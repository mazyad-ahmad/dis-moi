import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { playSound } from '../../audio/sounds';
import { getSettings } from '../../data/settings';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { ReadAloud } from '../../components/ReadAloud';
import { IconRefresh, IconTimer, IconTrash } from '../../components/icons';
import { vibrate } from '../../pwa/haptics';
import { clock } from '../format';
import { Replayable } from '../Replayable';
import { useSaved, useSavedDraw } from '../session';
import { orderByLevel, type Level } from '../levels';
import { useRoundSetting, useRounds } from '../useRounds';
import { DrawingCanvas, type DrawingCanvasHandle } from './DrawingCanvas';
import { useCountdown } from './useCountdown';
import { DRAW_LEVELS, DRAW_WORDS } from './words';

const PENS = [
  { label: 'Noir', color: 'var(--ink)' },
  { label: 'Vert', color: 'var(--forest)' },
  { label: 'Bleu', color: 'var(--river)' },
  { label: 'Or', color: 'var(--sun)' },
  { label: 'Rouge', color: 'var(--ember)' },
];

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
  // Tirage figé pour la partie (la banque peut venir d'une requête qui se met à jour),
  // retrouvé après un rafraîchissement.
  const words = useSavedDraw(
    gameId,
    'draw',
    bank,
    () => orderByLevel(bank, getSettings().gameLevel, levelOf),
    (w) => w,
  );
  const setting = useRoundSetting();
  // Pas plus de manches que de mots (jeux créés avec peu de mots).
  const { round, rounds, stars, finished, answer } = useRounds(
    gameId,
    Math.min(setting, words.length),
  );
  // Index du mot affiché : avance à chaque manche et avec « Autre mot ».
  const [index, setIndex] = useSaved(
    gameId,
    'index',
    () => 0,
    (i) => (Number.isInteger(i) && (i as number) >= 0 ? (i as number) : undefined),
  );
  // Durée réglée dans l'espace Parent, figée pour la partie.
  const [seconds] = useState(() => getSettings().drawSeconds);

  if (finished) return <GameResult stars={stars} rounds={rounds} onReplay={onReplay} />;

  return (
    <DrawingBoard
      heading={{ round, rounds, stars, category, title }}
      word={words[index % words.length]}
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

interface BoardProps {
  heading: Omit<ComponentProps<typeof GameHeader>, 'aside'>;
  word: string;
  /** Change à chaque nouveau mot : relance le minuteur. */
  turn: unknown;
  /** Durée du minuteur, en secondes. */
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
  const [pen, setPen] = useState(PENS[0].color);
  const canvas = useRef<DrawingCanvasHandle>(null);
  const left = useCountdown(seconds, turn);
  const timeUp = left <= 0;
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
          <span
            className={`timer${timeUp ? ' timer--done' : ''}`}
            role="timer"
            aria-label={timeUp ? 'Temps écoulé' : `${left} secondes restantes`}
          >
            <IconTimer size={20} />
            {clock(left)}
          </span>
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

      <div className="drawing-area">
        <DrawingCanvas ref={canvas} color={pen} disabled={timeUp} />
        <span className="drawing-area__hint muted" aria-live="polite">
          {timeUp ? 'Temps écoulé ! Le parent valide le dessin.' : "L'enfant dessine avec le doigt"}
        </span>
      </div>

      <div className="pen-bar">
        <div className="pen-bar__colors" role="radiogroup" aria-label="Couleurs">
          {PENS.map((p) => (
            <button
              key={p.label}
              type="button"
              role="radio"
              aria-checked={pen === p.color}
              aria-label={p.label}
              className="pen"
              style={{ background: p.color }}
              onClick={() => setPen(p.color)}
            />
          ))}
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Tout effacer"
          onClick={() => canvas.current?.clear()}
        >
          <IconTrash size={20} />
        </button>
      </div>

      <AnswerBar onSkip={() => next(false)} onFound={() => next(true)} foundLabel="C'est fini" />
    </main>
  );
}

export function DrawingGame(props: DrawingProps = {}) {
  return <Replayable>{(replay) => <DrawingSession {...props} onReplay={replay} />}</Replayable>;
}
