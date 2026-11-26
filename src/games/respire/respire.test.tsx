import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { resetAudioForTests } from '../../audio/context';
import { db } from '../../data/db';
import { beginGame, endGame, resetSeance } from '../../data/seance';
import { loadSettings, setSetting } from '../../data/settings';
import { contexts, FakeContext, played, resetFakeAudio } from '../../test/fakeAudio';
import { gameName } from '../useGames';
import { SETTLE_MS } from './BreatheGame';
import {
  BREATHE_ID,
  BREATHE_NAME,
  BREATHS,
  breathsFor,
  DEFAULT_BREATHS,
  EXERCISES,
  exerciseMs,
  PHASE_MS,
  phases,
} from './exercises';
import { BREATH_TONE } from './sound';

describe('rythme des exercices', () => {
  it('lent, sans rétention : on inspire 3 s, on souffle 4 s, rien entre les deux', () => {
    expect(PHASE_MS).toEqual({ in: 3000, out: 4000 });
    expect(PHASE_MS.out).toBeGreaterThanOrEqual(PHASE_MS.in);
    const list = phases(5);
    expect(list).toEqual(['in', 'out', 'in', 'out', 'in', 'out', 'in', 'out', 'in', 'out']);
    // Jamais deux temps identiques à la suite : aucune apnée possible.
    list.forEach((p, i) => i && expect(p).not.toBe(list[i - 1]));
  });

  it('dure entre 1 et 2 minutes, quel que soit l’âge', () => {
    for (const breaths of [...Object.values(BREATHS), DEFAULT_BREATHS]) {
      expect(exerciseMs(breaths)).toBeGreaterThanOrEqual(60_000);
      expect(exerciseMs(breaths)).toBeLessThanOrEqual(120_000);
    }
  });

  it('le plus jeune décide du nombre de respirations', () => {
    expect(breathsFor([])).toBe(DEFAULT_BREATHS);
    expect(breathsFor([3, 1])).toBe(BREATHS[1]);
    expect(BREATHS[1]).toBeLessThan(BREATHS[3]);
  });

  it('quatre exercices imagés, chacun avec un texte pour chaque temps', () => {
    expect(EXERCISES.map((e) => e.name)).toEqual([
      'Souffle comme le vent',
      'Respire comme un ours qui dort',
      'Gonfle un ballon',
      'Sens la fleur, souffle la bougie',
    ]);
    for (const e of EXERCISES) {
      expect(e.text.in).toBeTruthy();
      expect(e.text.out).toBeTruthy();
      expect(e.emoji.in).toBeTruthy();
    }
  });

  it('a son nom dans l’historique', () => {
    expect(gameName(BREATHE_ID)).toBe(BREATHE_NAME);
  });
});

describe('écran Respire comme…', () => {
  beforeEach(async () => {
    resetFakeAudio();
    resetAudioForTests();
    vi.stubGlobal('AudioContext', FakeContext);
    await Promise.all([db.games.clear(), db.settings.clear(), db.players.clear()]);
    await loadSettings();
    resetSeance();
    window.location.hash = '';
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** Fait tout l'exercice choisi, temps par temps, sans attendre pour de vrai. */
  async function breatheThrough(name: string) {
    await screen.findByRole('button', { name: new RegExp(name) });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }));
    const shape = screen.getByTestId('respire-shape');
    expect(shape).toHaveAttribute('data-phase', 'ready');
    act(() => vi.advanceTimersByTime(SETTLE_MS));
    expect(shape).toHaveAttribute('data-phase', 'in');
    expect(screen.getByText('On inspire')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(PHASE_MS.in));
    expect(shape).toHaveAttribute('data-phase', 'out');
    expect(screen.getByText('On souffle')).toBeInTheDocument();
    // Aucun minuteur ni compteur de respirations.
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
    // Chaque temps est programmé à la fin du précédent : on avance temps par temps.
    const rest = phases(DEFAULT_BREATHS).slice(1);
    rest.forEach((p, i) =>
      act(() => vi.advanceTimersByTime(PHASE_MS[p] - (i === rest.length - 1 ? 1 : 0))),
    );
    expect(screen.queryByRole('heading', { name: 'Tout calmes !' })).not.toBeInTheDocument();
    expect(shape).toHaveAttribute('data-phase', 'out');
    act(() => vi.advanceTimersByTime(1));
    vi.useRealTimers();
  }

  it('depuis l’accueil : l’exercice se termine avec l’animation, une étoile gagnée ensemble', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('link', { name: 'Respirer' }));
    expect(await screen.findByRole('heading', { name: BREATHE_NAME })).toBeInTheDocument();

    await breatheThrough('Gonfle un ballon');

    expect(await screen.findByRole('heading', { name: 'Tout calmes !' })).toBeInTheDocument();
    expect(screen.getByText(/Une étoile gagnée ensemble/)).toBeInTheDocument();
    await waitFor(async () =>
      expect(await db.games.toArray()).toMatchObject([
        { gameId: BREATHE_ID, stars: 1, mode: 'normal' },
      ]),
    );
    // Son doux facultatif : coupé par défaut.
    expect(played()).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Encore une fois' }));
    expect(screen.getByRole('button', { name: /Souffle comme le vent/ })).toBeInTheDocument();
  });

  it('« Arrêter » revient aux exercices sans rien enregistrer', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/respire';
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Respire comme un ours/ }));
    await user.click(screen.getByRole('button', { name: 'Arrêter' }));
    expect(screen.getByRole('button', { name: /Respire comme un ours/ })).toBeInTheDocument();
    expect(await db.games.count()).toBe(0);
  });

  it('mode Coucher : thème nuit et « Bonne nuit » à la fin', async () => {
    await setSetting('gameMode', 'coucher');
    window.location.hash = '#/respire';
    render(<App />);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('night'));
    await breatheThrough('Sens la fleur');
    expect(await screen.findByText('C’est l’heure de dormir. Bonne nuit !')).toBeInTheDocument();
  });

  it('son doux à la demande, qui monte quand on inspire', async () => {
    window.location.hash = '#/respire';
    render(<App />);
    const toggle = await screen.findByRole('button', { name: 'Son doux' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fireEvent.click(screen.getByRole('button', { name: /Souffle comme le vent/ }));
    act(() => vi.advanceTimersByTime(SETTLE_MS));
    vi.useRealTimers();
    await waitFor(() => expect(played()).toEqual([BREATH_TONE.in.from]));
    expect(contexts).toHaveLength(1);
  });

  it('sons de l’appli coupés : pas de son doux proposé', async () => {
    await setSetting('sounds', false);
    window.location.hash = '#/respire';
    render(<App />);
    await screen.findByRole('button', { name: /Gonfle un ballon/ });
    expect(screen.queryByRole('button', { name: 'Son doux' })).not.toBeInTheDocument();
  });

  it('après la fin de séance : proposé dans « Revenir plus tard », et il s’ouvre', async () => {
    await setSetting('sessionMinutes', 10);
    beginGame(Date.now() - 11 * 60_000);
    endGame(Date.now());
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Revenir plus tard' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Respirer' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Respirer ensemble' }));
    expect(await screen.findByRole('button', { name: /Gonfle un ballon/ })).toBeInTheDocument();
  });
});
