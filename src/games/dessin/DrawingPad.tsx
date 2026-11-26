import { useId, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { IconEraser, IconTrash, IconUndo } from '../../components/icons';
import { DrawingCanvas, type DrawingCanvasHandle } from './DrawingCanvas';

/** Palette de 8 couleurs ; elles suivent le thème (jour, nuit). */
const PENS = [
  { label: 'Noir', color: 'var(--ink)' },
  { label: 'Vert', color: 'var(--forest)' },
  { label: 'Bleu', color: 'var(--river)' },
  { label: 'Or', color: 'var(--sun)' },
  { label: 'Rouge', color: 'var(--ember)' },
  { label: 'Rose', color: 'var(--pen-rose)' },
  { label: 'Violet', color: 'var(--pen-violet)' },
  { label: 'Marron', color: 'var(--pen-brown)' },
] as const;

/** Trois épaisseurs, en pixels CSS. */
const WIDTHS = [
  { label: 'Fin', width: 4 },
  { label: 'Moyen', width: 8 },
  { label: 'Épais', width: 16 },
] as const;

/** La gomme est plus large que le crayon : on efface sans s'user le doigt. */
const ERASER_FACTOR = 3;

interface Props {
  /** Phrase sous le dessin (« L'enfant dessine avec le doigt »). */
  hint: ReactNode;
  /** Dessin figé (temps écoulé) : ni trait ni outil. */
  disabled?: boolean;
  /** Bouton posé dans un coin du dessin (« Garder », #52), selon le nombre de traits. */
  corner?: (strokes: number) => ReactNode;
  ref?: Ref<DrawingCanvasHandle>;
}

/**
 * Zone de dessin et ses outils, sur une seule ligne de boutons de 48 px (#51) :
 * couleur, épaisseur, gomme, annuler le dernier trait, tout effacer. Couleurs et
 * épaisseurs s'ouvrent au-dessus de la ligne, et se referment au choix.
 */
export function DrawingPad({ hint, disabled, corner, ref }: Props) {
  const [pen, setPen] = useState<(typeof PENS)[number]>(PENS[0]);
  const [size, setSize] = useState<(typeof WIDTHS)[number]>(WIDTHS[1]);
  const [erase, setErase] = useState(false);
  const [open, setOpen] = useState<'color' | 'width' | null>(null);
  const [count, setCount] = useState(0);
  const canvas = useRef<DrawingCanvasHandle>(null);
  const id = useId();

  // Le jeu efface le dessin à chaque nouveau mot.
  useImperativeHandle(ref, () => ({
    clear: () => canvas.current?.clear(),
    undo: () => canvas.current?.undo(),
    snapshot: () => canvas.current?.snapshot() ?? Promise.resolve(null),
  }));
  const toggle = (panel: 'color' | 'width') => setOpen(open === panel ? null : panel);

  return (
    <>
      <div className="drawing-area" onPointerDownCapture={() => setOpen(null)}>
        <DrawingCanvas
          ref={canvas}
          color={pen.color}
          width={erase ? size.width * ERASER_FACTOR : size.width}
          erase={erase}
          disabled={disabled}
          onCount={setCount}
        />
        <span className="drawing-area__hint muted" aria-live="polite">
          {hint}
        </span>
        {corner?.(count)}
      </div>

      <div
        className="pen-bar"
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(null);
        }}
      >
        {open === 'color' && (
          <div
            id={`${id}-color`}
            className="pen-panel pen-panel--colors"
            role="radiogroup"
            aria-label="Couleurs"
          >
            {PENS.map((p) => (
              <button
                key={p.label}
                type="button"
                role="radio"
                aria-checked={!erase && pen === p}
                aria-label={p.label}
                className="pen"
                style={{ background: p.color }}
                onClick={() => {
                  setPen(p);
                  setErase(false);
                  setOpen(null);
                }}
              />
            ))}
          </div>
        )}
        {open === 'width' && (
          <div id={`${id}-width`} className="pen-panel" role="radiogroup" aria-label="Épaisseurs">
            {WIDTHS.map((w) => (
              <button
                key={w.label}
                type="button"
                role="radio"
                aria-checked={size === w}
                aria-label={w.label}
                className="icon-btn pen-tool"
                onClick={() => {
                  setSize(w);
                  setOpen(null);
                }}
              >
                <span className="pen-dot" style={{ width: w.width + 2, height: w.width + 2 }} />
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="icon-btn pen-tool"
          aria-label={`Couleur : ${pen.label}`}
          aria-expanded={open === 'color'}
          aria-controls={open === 'color' ? `${id}-color` : undefined}
          disabled={disabled}
          onClick={() => toggle('color')}
        >
          <span className="pen-swatch" style={{ background: pen.color }} />
        </button>
        <button
          type="button"
          className="icon-btn pen-tool"
          aria-label={`Épaisseur : ${size.label}`}
          aria-expanded={open === 'width'}
          aria-controls={open === 'width' ? `${id}-width` : undefined}
          disabled={disabled}
          onClick={() => toggle('width')}
        >
          <span className="pen-dot" style={{ width: size.width + 2, height: size.width + 2 }} />
        </button>
        <button
          type="button"
          className="icon-btn pen-tool"
          aria-label="Gomme"
          aria-pressed={erase}
          disabled={disabled}
          onClick={() => {
            setErase(!erase);
            setOpen(null);
          }}
        >
          <IconEraser size={22} />
        </button>
        <button
          type="button"
          className="icon-btn pen-tool"
          aria-label="Annuler le dernier trait"
          disabled={disabled || !count}
          onClick={() => canvas.current?.undo()}
        >
          <IconUndo size={22} />
        </button>
        <button
          type="button"
          className="icon-btn pen-tool"
          aria-label="Tout effacer"
          disabled={disabled || !count}
          onClick={() => {
            canvas.current?.clear();
            setOpen(null);
          }}
        >
          <IconTrash size={22} />
        </button>
      </div>
    </>
  );
}
