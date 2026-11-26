import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings } from '../../data/settings';
import { DrawingBoard } from './DrawingGame';
import { drawHint, restoreVariant, twoTurn, VARIANTS } from './variants';

const ctx = new Proxy({}, { get: () => () => {} }) as CanvasRenderingContext2D;

beforeEach(async () => {
  sessionStorage.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx);
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});
afterEach(() => vi.restoreAllMocks());

function line(x: number) {
  const canvas = screen.getByLabelText('Zone de dessin');
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: x, clientY: 10 });
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: x + 20, clientY: 30 });
  fireEvent.pointerUp(canvas, { pointerId: 1 });
}

const word = () => screen.getByLabelText('Mot à dessiner').querySelector('strong')!.textContent;

describe('Façons de jouer (fonctions pures)', () => {
  it('chaque variante a son explication d’une phrase', () => {
    for (const v of VARIANTS.filter((v) => v.value !== 'classique')) {
      expect(v.about).toMatch(/^[^.!?]+[.!?]$/);
    }
  });

  it('retrouve une variante connue, ignore le reste', () => {
    expect(restoreVariant('mystere')).toBe('mystere');
    expect(restoreVariant('inconnue')).toBeUndefined();
    expect(restoreVariant(3)).toBeUndefined();
  });

  it('À deux : l’enfant commence, puis chacun son trait', () => {
    expect(twoTurn(0)).toBe("Au tour de l'enfant : un trait");
    expect(twoTurn(1)).toBe('Au tour du parent : un trait');
    expect(twoTurn(2, 'Léa')).toBe('Au tour de Léa : un trait');
  });

  it('la phrase sous le dessin suit la variante et le minuteur', () => {
    const at = { timeUp: false, strokes: 0 };
    expect(drawHint('classique', at)).toBe("L'enfant dessine avec le doigt");
    expect(drawHint('mystere', at)).toBe("L'enfant dessine, le parent devine");
    expect(drawHint('yeux', at)).toMatch(/yeux fermés/);
    expect(drawHint('mystere', { ...at, timeUp: true })).toBe('Temps écoulé ! Le parent devine.');
    expect(drawHint('deux', { ...at, timeUp: true })).toMatch(/Le parent valide/);
  });
});

describe('Dessine ça : variantes', () => {
  it('Dessin mystère : le mot se cache d’un geste, puis se découvre', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/jeu/dessin';
    render(<App />);
    const picker = screen.getByRole('radiogroup', { name: 'Façon de jouer' });
    expect(within(picker).getByRole('radio', { name: 'Classique' })).toBeChecked();
    // Le jeu habituel : pas d'explication, le parent lit le mot.
    expect(screen.getByText('Le parent lit à voix haute')).toBeInTheDocument();

    await user.click(within(picker).getByRole('radio', { name: 'Mystère' }));
    expect(screen.getByText(/le parent qui devine/)).toBeInTheDocument();
    const secret = word();
    expect(screen.getByText("Mot secret, pour l'enfant")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cacher le mot' }));
    expect(screen.queryByText(secret!)).not.toBeInTheDocument();
    expect(word()).toBe('Mot caché');
    expect(screen.getByText("L'enfant dessine, le parent devine")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Voir le mot' }));
    expect(word()).toBe(secret);

    // Le parent a deviné : une étoile, et le mot suivant s'affiche pour l'enfant.
    await user.click(screen.getByRole('button', { name: 'Cacher le mot' }));
    await user.click(screen.getByRole('button', { name: 'Deviné' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cacher le mot' })).toBeInTheDocument();
    expect(word()).not.toBe('Mot caché');
    // La variante reste choisie d'une manche à l'autre.
    expect(screen.getByRole('radio', { name: 'Mystère' })).toBeChecked();
  });

  it('À deux : la phrase dit à qui le tour, trait après trait', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/jeu/dessin';
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'À deux' }));
    expect(screen.getByText(/Un trait chacun/)).toBeInTheDocument();
    expect(screen.getByText("Au tour de l'enfant : un trait")).toBeInTheDocument();
    line(10);
    expect(screen.getByText('Au tour du parent : un trait')).toBeInTheDocument();
    line(40);
    expect(screen.getByText("Au tour de l'enfant : un trait")).toBeInTheDocument();
    // Même dessin, mêmes outils : annuler rend la main au parent.
    await user.click(screen.getByRole('button', { name: 'Annuler le dernier trait' }));
    expect(screen.getByText('Au tour du parent : un trait')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Yeux fermés' }));
    expect(screen.getByText(/On dessine les yeux fermés/)).toBeInTheDocument();
    expect(screen.getByText('Les yeux fermés ! On les ouvre à la fin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "C'est fini" })).toBeInTheDocument();
  });

  it('le Grand Jeu (sans choix) garde le jeu habituel', () => {
    render(
      <DrawingBoard
        heading={{ round: 1, rounds: 5, stars: 0, category: 'Dessin', title: 'Dessine ça' }}
        word="Un chat"
        turn={0}
        seconds={0}
        onAnswer={() => {}}
      />,
    );
    expect(screen.queryByRole('radiogroup', { name: 'Façon de jouer' })).not.toBeInTheDocument();
    expect(screen.getByText('Un chat')).toBeInTheDocument();
  });
});
