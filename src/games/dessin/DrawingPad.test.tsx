import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DrawingPad } from './DrawingPad';

/** Faux contexte 2D : note l'épaisseur et le mode (gomme ou non) de chaque trait peint. */
function fakeContext() {
  const log: string[] = [];
  const ctx = {
    lineWidth: 1,
    globalCompositeOperation: 'source-over',
    strokeStyle: '',
    lineCap: '',
    lineJoin: '',
    setTransform: () => {},
    clearRect: () => log.push('clear'),
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    stroke() {
      const op = `${ctx.globalCompositeOperation === 'destination-out' ? 'gomme' : 'trait'} ${ctx.lineWidth}`;
      if (log[log.length - 1] !== op) log.push(op);
    },
  };
  return { ctx, log };
}

let fake: ReturnType<typeof fakeContext>;
beforeEach(() => {
  fake = fakeContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => fake.ctx as unknown as CanvasRenderingContext2D,
  );
});
afterEach(() => vi.restoreAllMocks());

function line(x: number) {
  const canvas = screen.getByLabelText('Zone de dessin');
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: x, clientY: 10 });
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: x + 20, clientY: 30 });
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: x + 40, clientY: 20 });
  fireEvent.pointerUp(canvas, { pointerId: 1 });
}

/** Traits repeints au dernier redessin (après « Annuler »). */
const redrawn = () => fake.log.slice(fake.log.lastIndexOf('clear') + 1);

describe('Outils de dessin', () => {
  it('« Annuler » retire exactement le dernier trait, plusieurs fois de suite', async () => {
    const user = userEvent.setup();
    render(<DrawingPad hint="L'enfant dessine avec le doigt" />);
    const undo = screen.getByRole('button', { name: 'Annuler le dernier trait' });
    expect(undo).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tout effacer' })).toBeDisabled();

    line(10); // moyen : 8
    await user.click(screen.getByRole('button', { name: 'Épaisseur : Moyen' }));
    await user.click(screen.getByRole('radio', { name: 'Fin' }));
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument(); // refermé au choix
    line(50); // fin : 4
    await user.click(screen.getByRole('button', { name: 'Gomme' }));
    expect(screen.getByRole('button', { name: 'Gomme' })).toHaveAttribute('aria-pressed', 'true');
    line(90); // gomme, trois fois plus large : 12
    await user.click(screen.getByRole('button', { name: 'Épaisseur : Fin' }));
    await user.click(screen.getByRole('radio', { name: 'Épais' }));
    await user.click(screen.getByRole('button', { name: 'Gomme' }));
    line(130); // épais : 16

    await user.click(undo);
    expect(redrawn()).toEqual(['trait 8', 'trait 4', 'gomme 12']);
    await user.click(undo);
    expect(redrawn()).toEqual(['trait 8', 'trait 4']);
    await user.click(undo);
    expect(redrawn()).toEqual(['trait 8']);
    await user.click(undo);
    expect(redrawn()).toEqual([]);
    expect(undo).toBeDisabled();
  });

  it('choisir une couleur quitte la gomme ; huit couleurs proposées', async () => {
    const user = userEvent.setup();
    render(<DrawingPad hint="" />);
    await user.click(screen.getByRole('button', { name: 'Gomme' }));
    await user.click(screen.getByRole('button', { name: 'Couleur : Noir' }));
    const colors = screen.getByRole('radiogroup', { name: 'Couleurs' });
    expect(colors.querySelectorAll('[role="radio"]')).toHaveLength(8);
    await user.click(screen.getByRole('radio', { name: 'Violet' }));
    expect(screen.getByRole('button', { name: 'Couleur : Violet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gomme' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('dessin figé : ni trait ni outil', () => {
    render(<DrawingPad hint="Temps écoulé" disabled />);
    line(10);
    expect(fake.log).toEqual([]);
    for (const name of ['Couleur : Noir', 'Épaisseur : Moyen', 'Gomme', 'Tout effacer'])
      expect(screen.getByRole('button', { name })).toBeDisabled();
  });

  it('« Tout effacer » vide le dessin', async () => {
    const user = userEvent.setup();
    render(<DrawingPad hint="" />);
    line(10);
    line(40);
    await user.click(screen.getByRole('button', { name: 'Tout effacer' }));
    expect(redrawn()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Annuler le dernier trait' })).toBeDisabled();
    act(() => line(10));
    expect(screen.getByRole('button', { name: 'Annuler le dernier trait' })).toBeEnabled();
  });
});
