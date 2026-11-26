import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useState } from 'react';
import { useConfirm } from './useConfirm';

function Demo() {
  const [confirmDialog, confirm] = useConfirm();
  const [answer, setAnswer] = useState('');
  return (
    <>
      <button
        type="button"
        onClick={async () =>
          setAnswer(
            String(
              await confirm({
                title: 'Tout effacer ?',
                message: 'Rien ne pourra être récupéré.',
                confirmLabel: 'Tout effacer',
                danger: true,
              }),
            ),
          )
        }
      >
        Effacer
      </button>
      <output>{answer}</output>
      {confirmDialog}
    </>
  );
}

async function openDialog() {
  const user = userEvent.setup();
  render(<Demo />);
  await user.click(screen.getByRole('button', { name: 'Effacer' }));
  return { user, dialog: await screen.findByRole('alertdialog', { name: 'Tout effacer ?' }) };
}

describe('Dialogue de confirmation', () => {
  it('s’ouvre en modal, décrit l’action et met le focus sur « Annuler »', async () => {
    const { dialog } = await openDialog();
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAccessibleDescription('Rien ne pourra être récupéré.');
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Tout effacer' })).toHaveClass('btn--danger');
  });

  it('confirme avec le bouton explicite et rend le focus au bouton d’origine', async () => {
    const { user } = await openDialog();
    await user.click(screen.getByRole('button', { name: 'Tout effacer' }));
    expect(await screen.findByText('true')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Effacer' })).toHaveFocus();
  });

  it('annule avec « Annuler »', async () => {
    const { user } = await openDialog();
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(await screen.findByText('false')).toBeInTheDocument();
  });

  it('annule avec Échap ou le retour Android (événement cancel)', async () => {
    const { dialog } = await openDialog();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(await screen.findByText('false')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Effacer' })).toHaveFocus();
  });

  it('annule avec un toucher sur le voile, autour du dialogue', async () => {
    const { user, dialog } = await openDialog();
    await user.click(dialog);
    expect(await screen.findByText('false')).toBeInTheDocument();
  });

  // #147 : en développement (StrictMode), React monte, démonte puis remonte le dialogue.
  // L'évènement « close » du premier démontage ne doit pas refermer le dialogue rouvert.
  it.each([
    ['tout de suite', (fire: () => void) => fire()],
    ['un peu plus tard, comme le navigateur', (fire: () => void) => setTimeout(fire, 0)],
  ])('reste ouvert en StrictMode, close envoyé %s', async (_, schedule) => {
    const close = HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      if (!this.open) return;
      this.open = false;
      schedule(() => this.dispatchEvent(new Event('close')));
    };
    try {
      const user = userEvent.setup();
      render(
        <StrictMode>
          <Demo />
        </StrictMode>,
      );
      await user.click(screen.getByRole('button', { name: 'Effacer' }));
      const dialog = await screen.findByRole('alertdialog', { name: 'Tout effacer ?' });
      await new Promise((r) => setTimeout(r, 20));
      expect(dialog).toHaveAttribute('open');
      expect(screen.queryByText('false')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Tout effacer' }));
      expect(await screen.findByText('true')).toBeInTheDocument();
    } finally {
      HTMLDialogElement.prototype.close = close;
    }
  });
});
