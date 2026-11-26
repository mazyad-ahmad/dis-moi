import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { playSound } from '../audio/sounds';
import { db, type GameRecord } from '../data/db';
import { loadSettings, setSetting } from '../data/settings';
import { GAMES } from '../games/registry';
import { COUNT_START_MS, nextGame, resultMessage, resultRewards, resultTitle } from './result';

vi.mock('../audio/sounds', async (original) => ({
  ...(await original<typeof import('../audio/sounds')>()),
  playSound: vi.fn(() => Promise.resolve()),
}));

const sounds = () => vi.mocked(playSound).mock.calls.map(([name]) => name);

beforeEach(async () => {
  sessionStorage.clear();
  vi.mocked(playSound).mockClear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
  await setSetting('rounds', 5);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const record = (stars: number): GameRecord =>
  ({ gameId: 'lettres', rounds: 5, played: 5, stars, startedAt: 0, updatedAt: 0 }) as GameRecord;

describe('textes et calculs', () => {
  it('le titre dit les étoiles gagnées ensemble, ou bravo sans étoile', () => {
    expect(resultTitle(7)).toBe('7 étoiles gagnées ensemble !');
    expect(resultTitle(1)).toBe('1 étoile gagnées ensemble !');
    expect(resultTitle(0)).toBe('Bravo d’avoir joué !');
  });

  it('des messages variés selon le score, jamais négatifs', () => {
    const all = (stars: number, rounds: number) =>
      new Set([0, 0.34, 0.5, 0.67, 0.99].map((p) => resultMessage(stars, rounds, p)));
    expect(all(0, 10).size).toBeGreaterThan(1);
    expect(all(3, 10).size).toBeGreaterThan(1);
    expect(all(10, 10)).not.toEqual(all(3, 10));
    for (const stars of [0, 1, 3, 5, 8, 10])
      for (const m of all(stars, 10)) expect(m).not.toMatch(/raté|perdu|dommage|échec|nul/i);
    expect(resultMessage(0, 10, 0)).toMatch(/prochaine/);
  });

  it('récompenses franchies pendant la partie et prochaine récompense', () => {
    // Cette partie (en tête) et 8 étoiles avant elle : 8 + 4 = 12 franchit les 10.
    const records = [record(3), record(5), record(3)];
    expect(resultRewards(records, 4)).toMatchObject({
      unlocked: [{ stars: 10 }],
      next: { reward: { stars: 25 }, missing: 13 },
    });
    // Toute première partie : la première étoile.
    expect(resultRewards([record(0)], 2).unlocked.map((r) => r.stars)).toEqual([1]);
    expect(resultRewards([record(0)], 0)).toMatchObject({ unlocked: [], next: { missing: 1 } });
    // Deux paliers d'un coup.
    expect(resultRewards([record(0), record(9)], 16).unlocked.map((r) => r.stars)).toEqual([
      10, 25,
    ]);
    // Tout gagné : plus de rappel.
    expect(resultRewards([record(0), record(300)], 1).next).toBeUndefined();
  });

  it('« Un autre jeu » propose le jeu suivant de l’accueil', () => {
    expect(nextGame(GAMES, 'chanson')?.id).toBe('lettres');
    expect(nextGame(GAMES, 'dessin')?.id).toBe('raconte');
    expect(nextGame(GAMES, 'raconte')?.id).toBe('voix');
    expect(nextGame(GAMES, 'voix')?.id).toBe('histoire');
    expect(nextGame(GAMES, 'histoire')?.id).toBe('chanson');
    expect(nextGame(GAMES.slice(0, 1), 'chanson')).toBeUndefined();
  });
});

describe('écran de résultat', () => {
  function open(path: string) {
    window.location.hash = `#${path}`;
    return render(<App />);
  }

  async function play(user: ReturnType<typeof userEvent.setup>, found: boolean[]) {
    for (const f of found)
      await user.click(screen.getByRole('button', { name: f ? 'Trouvé' : 'Passer' }));
  }

  it('les étoiles apparaissent une à une, chacune avec son son', async () => {
    const user = userEvent.setup();
    open('/jeu/lettres');
    await act(() => Promise.resolve());
    await play(user, [true, true, false, true, false]);
    expect(screen.getByRole('heading', { name: '3 étoiles gagnées ensemble !' })).toBeVisible();
    const count = screen.getByTestId('result-count');
    expect(count).toHaveAttribute('aria-hidden', 'true');
    expect(count.children).toHaveLength(3);
    expect(count.children[1]).toHaveStyle({ '--delay': `${COUNT_START_MS + 350}ms` });

    const before = sounds().length;
    await act(() => new Promise((r) => setTimeout(r, COUNT_START_MS + 2 * 350 + 50)));
    expect(sounds().slice(before)).toEqual(['star', 'star', 'star']);
  });

  it('une récompense franchie pendant la partie : son et fête une seule fois', async () => {
    const user = userEvent.setup();
    const view = open('/jeu/lettres');
    await act(() => Promise.resolve());
    await play(user, [false, false, false, false, true]);
    // Première étoile sur la dernière réponse : le son de récompense est joué une fois, en jeu.
    expect(await screen.findByText(/Nouvelle récompense/)).toHaveTextContent(
      'Nouvelle récompense : Première étoile !',
    );
    expect(screen.getByText('Encore 9 étoiles pour la récompense « 10 étoiles ».')).toBeVisible();
    await act(() => new Promise((r) => setTimeout(r, COUNT_START_MS + 50)));
    expect(sounds().filter((s) => s === 'reward')).toHaveLength(1);
    expect(sounds().at(-1)).toBe('star');

    // Partie suivante : la récompense n'est plus fêtée.
    await user.click(screen.getByRole('button', { name: 'Rejouer' }));
    await act(() => Promise.resolve());
    await play(user, [true, false, false, false, false]);
    await screen.findByText('Encore 8 étoiles pour la récompense « 10 étoiles ».');
    expect(screen.queryByText(/Nouvelle récompense/)).not.toBeInTheDocument();
    view.unmount();
  });

  it('zéro étoile : un message encourageant, pas d’étoile à compter', async () => {
    const user = userEvent.setup();
    open('/jeu/dessin');
    await play(user, [false, false, false, false, false]);
    expect(screen.getByRole('heading', { name: 'Bravo d’avoir joué !' })).toBeVisible();
    expect(screen.queryByTestId('result-count')).not.toBeInTheDocument();
    expect(await screen.findByText(/Encore 1 étoile pour la récompense/)).toBeVisible();
  });

  it('« Un autre jeu » mène au jeu suivant, « Accueil » et « Rejouer » restent', async () => {
    const user = userEvent.setup();
    open('/jeu/lettres');
    await play(user, [true, true, true, true, true]);
    expect(screen.getByRole('link', { name: 'Un autre jeu : Dessine ça' })).toHaveAttribute(
      'href',
      '#/jeu/dessin',
    );
    expect(screen.getByRole('link', { name: 'Accueil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejouer' })).toBeInTheDocument();
  });

  it('« réduire les animations » : toutes les étoiles d’un coup, sans son de compte', async () => {
    vi.stubGlobal(
      'matchMedia',
      (query: string) => ({ matches: query.includes('reduced-motion') }) as MediaQueryList,
    );
    const user = userEvent.setup();
    open('/jeu/lettres');
    await play(user, [true, true, false, false, false]);
    expect(screen.getByTestId('result-count').children).toHaveLength(2);
    const before = sounds().length;
    await act(() => new Promise((r) => setTimeout(r, COUNT_START_MS + 400)));
    expect(sounds()).toHaveLength(before);
  });
});
