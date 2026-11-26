import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { keepDrawing, listDrawings } from '../../data/drawings';
import { addPlayer } from '../../data/players';
import { loadSettings } from '../../data/settings';
import { DrawingBoard } from './DrawingGame';
import { snapshotSize } from './snapshot';

/** Faux contexte 2D : assez pour tracer et pour fabriquer l'image gardée. */
const ctx = new Proxy({}, { get: () => () => {} }) as CanvasRenderingContext2D;

let images = 0;
beforeEach(async () => {
  images = 0;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done) =>
    done(new Blob([`image ${++images}`], { type: 'image/png' })),
  );
  await Promise.all([db.drawings.clear(), db.players.clear(), db.settings.clear()]);
  await loadSettings();
});
afterEach(() => vi.restoreAllMocks());

function line(x: number) {
  const canvas = screen.getByLabelText('Zone de dessin');
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: x, clientY: 10 });
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: x + 20, clientY: 30 });
  fireEvent.pointerUp(canvas, { pointerId: 1 });
}

const heading = { round: 1, rounds: 5, stars: 0, category: 'Dessin', title: 'Dessine ça' };

describe('Garder un dessin', () => {
  it('« Garder » n’apparaît qu’avec un dessin, et le garde avec le mot et les enfants', async () => {
    const user = userEvent.setup();
    const lea = await addPlayer('Léa');
    const onAnswer = vi.fn();
    render(
      <DrawingBoard heading={heading} word="Un chat" turn={0} seconds={0} onAnswer={onAnswer} />,
    );
    expect(screen.queryByRole('button', { name: 'Garder' })).not.toBeInTheDocument();
    line(10);
    await user.click(screen.getByRole('button', { name: 'Garder' }));
    expect(await screen.findByRole('button', { name: 'Gardé' })).toBeDisabled();
    const [kept] = await listDrawings();
    expect(kept).toMatchObject({ word: 'Un chat', playerIds: [lea] });
    expect(kept.image).toBeDefined();
    expect(images).toBe(1);

    // L'enfant continue : un nouvel appui met à jour le même dessin.
    line(40);
    await user.click(screen.getByRole('button', { name: 'Garder' }));
    await screen.findByRole('button', { name: 'Gardé' });
    const all = await listDrawings();
    expect(all).toHaveLength(1);
    expect(images).toBe(2);

    // « Tout effacer » puis un autre dessin : gardé à part.
    await user.click(screen.getByRole('button', { name: 'Tout effacer' }));
    line(10);
    await user.click(screen.getByRole('button', { name: 'Garder' }));
    await screen.findByRole('button', { name: 'Gardé' });
    expect(await db.drawings.count()).toBe(2);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('chacun son tour : le dessin est celui de l’enfant de la manche', async () => {
    const user = userEvent.setup();
    await addPlayer('Léa');
    const sami = await addPlayer('Sami');
    const player = (await db.players.get(sami))!;
    render(
      <DrawingBoard
        heading={{ ...heading, player }}
        word="Un bateau"
        turn={0}
        seconds={0}
        onAnswer={() => {}}
      />,
    );
    line(10);
    await user.click(screen.getByRole('button', { name: 'Garder' }));
    await screen.findByRole('button', { name: 'Gardé' });
    expect((await listDrawings())[0].playerIds).toEqual([sami]);
  });

  it('sans « Garder », rien n’est enregistré', async () => {
    const user = userEvent.setup();
    render(
      <DrawingBoard heading={heading} word="Un chat" turn={0} seconds={0} onAnswer={() => {}} />,
    );
    line(10);
    await user.click(screen.getByRole('button', { name: "C'est fini" }));
    expect(await db.drawings.count()).toBe(0);
  });

  it('l’image gardée est réduite sans être déformée', () => {
    expect(snapshotSize(800, 600)).toEqual({ w: 800, h: 600 });
    expect(snapshotSize(1080, 2560)).toEqual({ w: 540, h: 1280 });
  });
});

describe('Galerie des dessins gardés', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:dessin');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('montre le mot, la date et l’enfant ; partage seulement sur le geste du parent', async () => {
    const user = userEvent.setup();
    const lea = await addPlayer('Léa');
    await keepDrawing(
      { word: 'Un chat', image: new Blob(['png'], { type: 'image/png' }), playerIds: [lea] },
      new Date(2026, 10, 5).getTime(),
    );
    const share = vi.fn(async () => {});
    Object.assign(navigator, { canShare: () => true, share });

    window.location.hash = '#/dessins';
    render(<App />);
    const item = await screen.findByRole('button', { name: 'Un chat, Léa, 5 novembre 2026' });
    expect(share).not.toHaveBeenCalled();

    await user.click(item);
    const viewer = await screen.findByRole('dialog', { name: 'Un chat' });
    expect(within(viewer).getByRole('img', { name: 'Dessin : Un chat' })).toBeInTheDocument();
    expect(share).not.toHaveBeenCalled();
    await user.click(within(viewer).getByRole('button', { name: 'Partager l’image' }));
    expect(share).toHaveBeenCalledTimes(1);
    const [{ files }] = share.mock.calls[0] as unknown as [{ files: File[] }];
    expect(files[0]).toMatchObject({ name: 'dessin-un-chat-2026-11-05.png', type: 'image/png' });

    await user.click(within(viewer).getByRole('button', { name: 'Supprimer' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Supprimer' }));
    await waitFor(async () => expect(await db.drawings.count()).toBe(0));
    expect(await screen.findByText(/Aucun dessin pour l’instant/)).toBeInTheDocument();
    Reflect.deleteProperty(navigator, 'canShare');
    Reflect.deleteProperty(navigator, 'share');
  });
});
