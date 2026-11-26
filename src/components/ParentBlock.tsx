import { useState, type ReactNode } from 'react';
import { IconEye, IconPlus } from './icons';

interface Props {
  title?: string;
  /** Contenu masqué tant que le parent n'a pas appuyé sur le bouton. */
  hidden?: ReactNode;
  revealLabel?: string;
  /**
   * Indices en escalier (#34) : chaque appui sur « Encore un indice » en montre un de plus,
   * jamais la réponse, qui reste derrière « Voir la réponse ».
   */
  hints?: ReactNode[];
  /** Nombre d'indices visibles d'emblée (par défaut : aucun). */
  openHints?: number;
  /** Appelé avec le nombre d'indices visibles après chaque appui. */
  onHint?: (shown: number) => void;
  children?: ReactNode;
}

/** Zone réservée au parent : réponse, indices, consigne. */
export function ParentBlock({
  title = 'Pour le parent',
  hidden,
  revealLabel = 'Voir la réponse',
  hints = [],
  openHints = 0,
  onHint,
  children,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const [shown, setShown] = useState(Math.min(openHints, hints.length));
  const more = () => {
    const next = Math.min(shown + 1, hints.length);
    setShown(next);
    onHint?.(next);
  };
  return (
    <section className="parent-block" aria-label={title}>
      <span className="parent-block__title">{title}</span>
      {hidden !== undefined &&
        (revealed ? (
          <div className="parent-block__answer">{hidden}</div>
        ) : (
          <button type="button" className="parent-block__reveal" onClick={() => setRevealed(true)}>
            <IconEye size={20} />
            {revealLabel}
          </button>
        ))}
      {children && <div className="parent-block__body">{children}</div>}
      {hints.length > 0 && (
        <div className="parent-block__hints" aria-live="polite">
          {hints.slice(0, shown).map((hint, i) => (
            <p key={i}>Indice : {hint}</p>
          ))}
        </div>
      )}
      {/* Une fois la réponse vue, plus besoin d'indice. */}
      {shown < hints.length && !revealed && (
        <button type="button" className="parent-block__reveal" onClick={more}>
          <IconPlus size={20} />
          {shown === 0 ? 'Un indice' : 'Encore un indice'}
        </button>
      )}
    </section>
  );
}
