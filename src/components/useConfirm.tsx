import { useCallback, useState, type ReactNode } from 'react';
import { ConfirmDialog, type ConfirmOptions } from './ConfirmDialog';

/**
 * Remplace `window.confirm` :
 *   const [confirmDialog, confirm] = useConfirm();
 *   if (!(await confirm({ title: 'Tout effacer ?', confirmLabel: 'Effacer', danger: true }))) return;
 *   …
 *   return <>{…}{confirmDialog}</>;
 */
export function useConfirm(): [ReactNode, (options: ConfirmOptions) => Promise<boolean>] {
  const [pending, setPending] = useState<{
    options: ConfirmOptions;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  );

  const dialog = pending && (
    <ConfirmDialog
      {...pending.options}
      onAnswer={(ok) => {
        pending.resolve(ok);
        setPending(null);
      }}
    />
  );
  return [dialog, confirm];
}
