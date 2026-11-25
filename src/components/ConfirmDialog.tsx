import { useId, useRef } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Libellé explicite de l'action (« Effacer », pas « OK »). */
  confirmLabel: string;
  cancelLabel?: string;
  /** Action destructive : bouton de confirmation en rouge. */
  danger?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Annuler',
  danger,
  onAnswer,
}: ConfirmOptions & { onAnswer: (ok: boolean) => void }) {
  const id = useId();
  const cancel = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      role="alertdialog"
      labelledBy={`${id}-title`}
      describedBy={message ? `${id}-message` : undefined}
      // Action sûre par défaut : le focus va sur « Annuler ».
      initialFocus={cancel}
      onClose={() => onAnswer(false)}
    >
      <h2 id={`${id}-title`} className="dialog__title">
        {title}
      </h2>
      {message && (
        <p id={`${id}-message`} className="dialog__message">
          {message}
        </p>
      )}
      <div className="dialog__actions">
        <Button variant={danger ? 'danger' : 'primary'} block onClick={() => onAnswer(true)}>
          {confirmLabel}
        </Button>
        <Button ref={cancel} variant="secondary" block onClick={() => onAnswer(false)}>
          {cancelLabel}
        </Button>
      </div>
    </Dialog>
  );
}
