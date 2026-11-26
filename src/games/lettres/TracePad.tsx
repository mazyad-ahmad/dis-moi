import { useRef, useState } from 'react';
import { IconPlay, IconTrash, IconUndo } from '../../components/icons';
import { DrawingCanvas, type DrawingCanvasHandle } from '../dessin/DrawingCanvas';
import { strokeMarkers } from './trace';
import './trace.css';

/** Trait large et tolérant : un doigt d'enfant n'a pas besoin d'être précis. */
export const TRACE_WIDTH = 22;

/** Durée de la démonstration d'un trait (ms), le suivant part ensuite. */
export const DEMO_STROKE_MS = 900;

interface Props {
  /** Traits du modèle (`TRACES`). */
  strokes: readonly string[];
  /** Nom du modèle pour le lecteur d'écran (« Lettre A »). */
  label: string;
}

/**
 * Tracé au doigt (#49) : le modèle en pointillés, ses points de départ numérotés et le sens
 * de chaque trait, au-dessus de la zone où l'enfant repasse (le modèle ne bouge pas et reste
 * visible par-dessus son trait). Consignes et boutons sont au-dessus du dessin : ni une main
 * droite ni une main gauche ne les cachent. Pas de note : le parent valide.
 */
export function TracePad({ strokes, label }: Props) {
  const canvas = useRef<DrawingCanvasHandle>(null);
  const [count, setCount] = useState(0);
  // Numéro de la démonstration en cours (0 : aucune) ; un nouvel appui la rejoue.
  const [demo, setDemo] = useState(0);
  const markers = strokeMarkers(strokes);

  return (
    <div className="trace round-in">
      <p className="trace__help">
        Pars du point <strong>1</strong> et suis la flèche
        {strokes.length > 1 && (
          <>, puis le point {strokes.length > 2 ? 'suivant' : <strong>2</strong>}</>
        )}
        .
      </p>
      <div className="trace__tools">
        <button type="button" className="btn btn--secondary" onClick={() => setDemo(demo + 1)}>
          <IconPlay size={20} />
          Voir le tracé
        </button>
        <button
          type="button"
          className="icon-btn pen-tool"
          aria-label="Annuler le dernier trait"
          disabled={!count}
          onClick={() => canvas.current?.undo()}
        >
          <IconUndo size={22} />
        </button>
        <button
          type="button"
          className="icon-btn pen-tool"
          aria-label="Tout effacer"
          disabled={!count}
          onClick={() => canvas.current?.clear()}
        >
          <IconTrash size={22} />
        </button>
      </div>

      {/* L'enfant reprend la main : la démonstration s'efface. */}
      <div className="drawing-area trace__area" onPointerDownCapture={() => setDemo(0)}>
        <DrawingCanvas ref={canvas} color="var(--forest)" width={TRACE_WIDTH} onCount={setCount} />
        <svg
          className="trace__model"
          viewBox="-10 -10 120 120"
          role="img"
          aria-label={`${label} en pointillés, à repasser du doigt`}
          data-testid="trace-model"
        >
          {strokes.map((d, i) => (
            <path key={`g${i}`} className="trace__guide" d={d} />
          ))}
          {strokes.map((d, i) => (
            <path key={`d${i}`} className="trace__dots" d={d} />
          ))}
          {demo > 0 && (
            <g key={demo} data-testid="trace-demo">
              {strokes.map((d, i) => (
                <path
                  key={i}
                  className="trace__demo"
                  d={d}
                  pathLength={1}
                  style={{
                    animationDuration: `${DEMO_STROKE_MS}ms`,
                    animationDelay: `${i * DEMO_STROKE_MS}ms`,
                  }}
                />
              ))}
            </g>
          )}
          {markers.map((m) => (
            <g key={m.n} className="trace__marker">
              <circle className="trace__start" cx={m.start.x} cy={m.start.y} r="3.5" />
              <path
                className="trace__arrow"
                d="M-3.5 -4 L4 0 L-3.5 4 Z"
                transform={`translate(${m.arrow.x} ${m.arrow.y}) rotate(${m.angle})`}
              />
              <circle className="trace__badge" cx={m.badge.x} cy={m.badge.y} r="4.5" />
              <text className="trace__number" x={m.badge.x} y={m.badge.y}>
                {m.n}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
