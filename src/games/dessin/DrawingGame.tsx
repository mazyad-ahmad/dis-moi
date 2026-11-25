import { useMemo, useRef, useState } from 'react';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { IconRefresh, IconTimer, IconTrash } from '../../components/icons';
import { clock } from '../format';
import { Replayable } from '../Replayable';
import { shuffle } from '../shuffle';
import { useRounds } from '../useRounds';
import { DrawingCanvas, type DrawingCanvasHandle } from './DrawingCanvas';
import { useCountdown } from './useCountdown';
import { DRAW_WORDS } from './words';

/** Durée du minuteur (docs/FONCTIONNEMENT.md). Réglable plus tard (#12). */
export const DRAW_SECONDS = 60;

const PENS = [
  { label: 'Noir', color: 'var(--ink)' },
  { label: 'Vert', color: 'var(--forest)' },
  { label: 'Bleu', color: 'var(--river)' },
  { label: 'Or', color: 'var(--sun)' },
  { label: 'Rouge', color: 'var(--ember)' },
];

function DrawingSession({ onReplay }: { onReplay: () => void }) {
  const { round, rounds, stars, finished, answer } = useRounds('dessin');
  const words = useMemo(() => shuffle(DRAW_WORDS), []);
  // Index du mot affiché : avance à chaque manche et avec « Autre mot ».
  const [index, setIndex] = useState(0);
  const [pen, setPen] = useState(PENS[0].color);
  const canvas = useRef<DrawingCanvasHandle>(null);
  const left = useCountdown(DRAW_SECONDS, index);

  if (finished) return <GameResult stars={stars} rounds={rounds} onReplay={onReplay} />;

  const word = words[index % words.length];
  const nextWord = () => {
    canvas.current?.clear();
    setIndex((i) => i + 1);
  };
  const next = (found: boolean) => {
    nextWord();
    answer(found);
  };
  const timeUp = left <= 0;

  return (
    <main className="screen screen--tight">
      <GameHeader
        round={round}
        rounds={rounds}
        stars={stars}
        category="Dessin"
        title="Dessine ça"
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

export function DrawingGame() {
  return <Replayable>{(replay) => <DrawingSession onReplay={replay} />}</Replayable>;
}
