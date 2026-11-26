import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';

interface DialogProps {
  /** Appelé une seule fois : Échap, retour Android, clic à côté ou bouton du dialogue. */
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  role?: 'dialog' | 'alertdialog';
  /** Élément qui reçoit le focus à l'ouverture (sinon le premier élément focusable). */
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Tab et Maj+Tab bouclent dans le dialogue au lieu de partir vers le navigateur. */
function trapTab(e: KeyboardEvent<HTMLDialogElement>) {
  if (e.key !== 'Tab') return;
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Dialogue modal du design system, monté seulement quand il est ouvert.
 * `<dialog>` natif : focus piégé, reste de la page inerte, Échap et retour Android
 * (événement « cancel »). Le focus revient sur l'élément d'origine à la fermeture.
 */
export function Dialog({
  onClose,
  labelledBy,
  describedBy,
  role = 'dialog',
  initialFocus,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const closed = useRef(false);
  // Fermeture faite par nous au démontage : son évènement « close » n'est pas un « Annuler ».
  // En développement (StrictMode), React démonte puis remonte aussitôt le dialogue ; sans ce
  // repère, l'évènement arrivait après la réouverture et refermait tout (#147).
  const selfClosed = useRef(false);
  const close = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    onClose();
  }, [onClose]);

  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    closed.current = false;
    if (!dialog.open) dialog.showModal();
    initialFocus?.current?.focus();
    return () => {
      if (dialog.open) {
        selfClosed.current = true;
        dialog.close();
      }
      if (opener?.isConnected) opener.focus();
    };
    // Ouverture une seule fois, au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialog"
      role={role}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(e) => {
        // Échap ou retour Android : c'est React qui démonte le dialogue.
        e.preventDefault();
        close();
      }}
      // Fermeture forcée par le navigateur (retours répétés) : on suit.
      onClose={() => {
        if (selfClosed.current) {
          selfClosed.current = false;
          return;
        }
        if (!ref.current?.open) close();
      }}
      // Clic sur le voile (hors du contenu) : comme « Annuler ».
      onClick={(e) => e.target === e.currentTarget && close()}
      onKeyDown={trapTab}
    >
      <div className="dialog__body">{children}</div>
    </dialog>
  );
}
