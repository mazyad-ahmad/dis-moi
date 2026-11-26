import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { DIGITS, LETTERS, LOWERCASE } from './bank';
import { TracePad } from './TracePad';
import { pathNumbers, strokeMarkers, strokeStart, TRACES, traceOf } from './trace';

describe('modèles de tracé (#49)', () => {
  it('chaque majuscule et chaque chiffre a son modèle ; pas les minuscules', () => {
    for (const card of [...LETTERS, ...DIGITS]) expect(traceOf(card)?.length).toBeGreaterThan(0);
    expect(traceOf(LOWERCASE[0])).toBeUndefined();
  });

  it('des chemins simples, dans le carré de 100', () => {
    for (const [glyph, strokes] of Object.entries(TRACES))
      for (const d of strokes) {
        expect(d, glyph).toMatch(/^M[\d .-]+([LCQ][\d .-]+)+$/);
        const nums = pathNumbers(d);
        expect(nums.length % 2, glyph).toBe(0);
        for (const n of nums) expect(n >= 0 && n <= 100, `${glyph} : ${d}`).toBe(true);
      }
  });

  it('départ et sens du tracé : le premier point, vers le suivant', () => {
    expect(strokeStart('M50 10 L20 90').start).toEqual({ x: 50, y: 10 });
    // Le O part du haut vers la gauche (sens inverse des aiguilles d'une montre).
    expect(strokeStart(TRACES.O[0]).dir).toEqual({ x: -1, y: 0 });
    expect(strokeStart('M25 10 L25 90').dir).toEqual({ x: 0, y: 1 });
  });

  it('les numéros de deux traits ne se chevauchent pas', () => {
    for (const [glyph, strokes] of Object.entries(TRACES)) {
      const markers = strokeMarkers(strokes);
      expect(markers.map((m) => m.n)).toEqual(strokes.map((_, i) => i + 1));
      for (const a of markers)
        for (const b of markers)
          if (a.n < b.n)
            expect(
              Math.hypot(a.badge.x - b.badge.x, a.badge.y - b.badge.y),
              `${glyph} ${a.n}-${b.n}`,
            ).toBeGreaterThanOrEqual(9);
    }
  });
});

describe('zone de tracé', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          setTransform() {},
          clearRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          quadraticCurveTo() {},
          stroke() {},
        }) as unknown as CanvasRenderingContext2D,
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it('le modèle reste affiché pendant que l’enfant trace ; démonstration à la demande', async () => {
    const user = userEvent.setup();
    render(<TracePad strokes={TRACES.A} label="Lettre A" />);
    const model = screen.getByRole('img', { name: 'Lettre A en pointillés, à repasser du doigt' });
    // Trois traits, chacun avec son numéro de départ.
    expect(within(model).getByText('1')).toBeInTheDocument();
    expect(within(model).getByText('3')).toBeInTheDocument();
    expect(screen.queryByTestId('trace-demo')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Voir le tracé' }));
    const demo = screen.getByTestId('trace-demo');
    expect(demo.querySelectorAll('path')).toHaveLength(3);

    const canvas = screen.getByLabelText('Zone de dessin');
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 30, clientY: 40 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    // La démonstration s'efface quand l'enfant reprend la main ; le modèle reste.
    expect(screen.queryByTestId('trace-demo')).not.toBeInTheDocument();
    expect(model).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler le dernier trait' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Tout effacer' }));
    expect(screen.getByRole('button', { name: 'Annuler le dernier trait' })).toBeDisabled();
    expect(model).toBeInTheDocument();
  });

  it('consignes et boutons au-dessus du dessin (rien sous la main, droite ou gauche)', () => {
    render(<TracePad strokes={TRACES['4']} label="Chiffre 4" />);
    const area = screen.getByLabelText('Zone de dessin').parentElement!;
    for (const el of [
      screen.getByText(/Pars du point/),
      screen.getByRole('button', { name: 'Voir le tracé' }),
      screen.getByRole('button', { name: 'Tout effacer' }),
    ])
      expect(el.compareDocumentPosition(area) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Rien d'autre que le dessin et le modèle dans la zone.
    expect(area.querySelectorAll('button, p')).toHaveLength(0);
  });
});

describe('Quelle lettre : tracer au doigt', () => {
  beforeEach(async () => {
    await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => vi.restoreAllMocks());

  it('majuscules et chiffres, le parent valide ; pas proposé ailleurs', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/jeu/lettres';
    render(<App />);
    const toggle = screen.getByRole('button', { name: 'Tracer au doigt' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('trace-model')).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: /^Lettre [A-Z] en pointillés/ })).toBeInTheDocument();
    expect(screen.queryByTestId('glyph')).not.toBeInTheDocument();
    expect(screen.getByText(/L’enfant repasse/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'C’est tracé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Chiffres'));
    expect(screen.getByRole('img', { name: /^Chiffre \d en pointillés/ })).toBeInTheDocument();

    // Minuscules : pas de modèle, le glyphe revient.
    await user.click(screen.getByLabelText('Minuscules'));
    expect(screen.queryByRole('button', { name: 'Tracer au doigt' })).not.toBeInTheDocument();
    expect(screen.getByTestId('glyph')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trouvé' })).toBeInTheDocument();

    // Le choix est gardé : retour aux majuscules, toujours en tracé.
    await user.click(screen.getByLabelText('Majuscules'));
    expect(screen.getByTestId('trace-model')).toBeInTheDocument();
  });
});
