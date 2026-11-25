import { useState, type ReactNode } from 'react';
import { IconEye } from './icons';

interface Props {
  title?: string;
  /** Contenu masqué tant que le parent n'a pas appuyé sur le bouton. */
  hidden?: ReactNode;
  revealLabel?: string;
  children?: ReactNode;
}

/** Zone réservée au parent : réponse, indice, consigne. */
export function ParentBlock({
  title = 'Pour le parent',
  hidden,
  revealLabel = 'Voir la réponse',
  children,
}: Props) {
  const [revealed, setRevealed] = useState(false);
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
    </section>
  );
}
