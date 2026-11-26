import { useEffect, useRef, useState } from 'react';
import { getSettings } from '../../data/settings';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { IconRefresh, IconTimer, IconTrash } from '../../components/icons';
import { vibrate } from '../../pwa/haptics';
import { clock } from '../format';
import { Replayable } from '../Replayable';
import { useSaved, useSavedDraw } from '../session';
import { shuffle } from '../shuffle';
import { useRoundSetting, useRounds } from '../useRounds';
import { DrawingCanvas, type DrawingCanvasHandle } from './DrawingCanvas';
import { useCountdown } from './useCountdown';
import { DRAW_WORDS } from './words';

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
}

function DrawingSession({
  onReplay,
  gameId = 'dessin',
  category = 'Dessin',
  title = 'Dessine ça',
  words: bank = DRAW_WORDS,
}: DrawingProps & { onReplay: () => void }) {
  // Tirage figé pour la partie (la banque peut venir d'une requête qui se met à jour),
  // retrouvé après un rafraîchissement.
  const words = useSavedDraw(
    gameId,
    'draw',
    bank,
    () => shuffle(bank),
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
  const [pen, setPen] = useState(PENS[0].color);
  const canvas = useRef<DrawingCanvasHandle>(null);
  // Durée réglée dans l'espace Parent, figée pour la partie.
  const [seconds] = useState(() => getSettings().drawSeconds);
  const left = useCountdown(seconds, index);
  const timeUp = left <= 0;
  // Double vibration quand le temps est écoulé : le dessin est figé, l'enfant a fini.
  useEffect(() => {
    if (timeUp && !finished) vibrate('timeUp');
  }, [timeUp, finished]);

  if (finished) return <GameResult stars={stars} rounds={rounds} onReplay={onReplay} />;

  const word = words[index % words.length];
  const nextWord = () => {
    canvas.current?.clear();
    setIndex(index + 1);
  };
  const next = (found: boolean) => {
    nextWord();
    answer(found);
  };

  return (
    <main className="screen screen--tight">
      <GameHeader
        round={round}
        rounds={rounds}
        stars={stars}
        category={category}
        title={title}
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
        <div>
          <span className="word-card__label">Le parent lit à voix haute</span>
          <strong className="word-card__word">{word}</strong>
        </div>
        <button
          type="button"
          className="icon-btn word-card__other"
          onClick={nextWord}
          aria-label="Autre mot"
        >
          <IconRefresh size={20} />
        </button>
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
