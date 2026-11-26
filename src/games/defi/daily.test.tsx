import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db, type GameRecord } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import {
  DAILY_ID,
  DAILY_SOURCES,
  dailyDone,
  dailyPick,
  dayKey,
  KIND_WORDS,
  msToMidnight,
  useToday,
} from './daily';

const record = (startedAt: number, stars = 1): GameRecord => ({
  id: startedAt,
  gameId: DAILY_ID,
  startedAt,
  updatedAt: startedAt,
  played: 1,
  rounds: 1,
  stars,
  playerIds: [],
});

describe('tirage du défi du jour', () => {
  it('suit le jour du téléphone : même carte toute la journée, autre jour à minuit', () => {
    const morning = new Date(2026, 10, 26, 0, 0, 1);
    const evening = new Date(2026, 10, 26, 23, 59, 59);
    const tomorrow = new Date(2026, 10, 27, 0, 0, 0);
    expect(dayKey(morning)).toBe('2026-11-26');
    expect(dayKey(evening)).toBe('2026-11-26');
    expect(dayKey(tomorrow)).toBe('2026-11-27');
    expect(dailyPick(dayKey(morning))).toEqual(dailyPick(dayKey(evening)));
    expect(msToMidnight(evening.getTime())).toBe(1000);
  });

  it('tire de tous les jeux intégrés, une carte valable chaque jour', () => {
    const games = new Set<string>();
    const cards = new Set<unknown>();
    for (let i = 0; i < 365; i++) {
      const { source, card } = dailyPick(dayKey(new Date(2026, 0, 1 + i)));
      expect(source.cards).toContain(card);
      games.add(source.name);
      cards.add(card);
    }
    expect(games).toEqual(new Set(DAILY_SOURCES.map((s) => s.name)));
    // Pas toujours la même carte.
    expect(cards.size).toBeGreaterThan(100);
  });

  it('ne compte comme réussi que le défi du jour', () => {
    const today = new Date(2026, 10, 26, 9).getTime();
    const yesterday = new Date(2026, 10, 25, 20).getTime();
    expect(dailyDone([record(yesterday)], '2026-11-26')).toBe(false);
    expect(dailyDone([record(today)], '2026-11-26')).toBe(true);
    expect(dailyDone([{ ...record(today), gameId: 'chanson' }], '2026-11-26')).toBe(false);
  });

  it('change de jour à minuit, appli ouverte', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    try {
      vi.setSystemTime(new Date(2026, 10, 26, 23, 59, 30));
      const { result } = renderHook(() => useToday());
      expect(result.current).toBe('2026-11-26');
      act(() => vi.advanceTimersByTime(32_000));
      expect(result.current).toBe('2026-11-27');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('défi du jour sur l’accueil', () => {
  beforeEach(async () => {
    await Promise.all([db.games.clear(), db.settings.clear(), db.players.clear()]);
    await loadSettings();
    window.location.hash = '';
  });

  it('se joue depuis l’accueil : une étoile bonus et un mot gentil', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('link', { name: /Défi du jour/ }));

    const { source, card } = dailyPick(dayKey());
    expect(await screen.findByRole('heading', { name: source.name })).toBeInTheDocument();
    expect(screen.getByText('Défi du jour')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: card.kind === 'draw' ? "C'est fini" : 'Trouvé' }),
    );

    expect(await screen.findByRole('heading', { name: 'Défi réussi !' })).toBeInTheDocument();
    expect(screen.getByText('Une étoile bonus gagnée ensemble.')).toBeInTheDocument();
    expect(KIND_WORDS.some((w) => screen.queryByText(w))).toBe(true);
    await waitFor(async () => {
      const games = await db.games.toArray();
      expect(games).toMatchObject([{ gameId: DAILY_ID, stars: 1 }]);
    });

    // Une seule étoile par jour : l'accueil dit à demain.
    await user.click(screen.getByRole('link', { name: 'Accueil' }));
    expect(await screen.findByText('Réussi ! À demain.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Défi du jour/ })).not.toBeInTheDocument();
  });

  it('« Pas encore » revient à l’accueil sans rien enregistrer', async () => {
    const user = userEvent.setup();
    window.location.hash = `#/jeu/${DAILY_ID}`;
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Pas encore' }));
    expect(await screen.findByRole('link', { name: /Défi du jour/ })).toBeInTheDocument();
    expect(await db.games.count()).toBe(0);
  });

  it('un jour manqué ne laisse aucun reproche : seulement le défi du jour', async () => {
    const lastWeek = Date.now() - 7 * 24 * 3600 * 1000;
    await db.games.add(record(lastWeek));
    render(<App />);
    expect(await screen.findByText('Une étoile bonus')).toBeInTheDocument();
    expect(screen.queryByText(/manqué|raté|série|dommage/i)).not.toBeInTheDocument();
  });

  it('se masque depuis l’espace Parent', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/parent/partie';
    render(<App />);
    const group = screen.getByRole('group', { name: 'Défi du jour' });
    expect(group).toBeInTheDocument();
    await user.click(screen.getByLabelText('Masqué'));
    window.location.hash = '#/';
    expect(await screen.findByRole('heading', { name: 'On joue à quoi ?' })).toBeInTheDocument();
    expect(screen.queryByText('Défi du jour')).not.toBeInTheDocument();

    await setSetting('dailyChallenge', true);
    expect(await screen.findByText('Défi du jour')).toBeInTheDocument();
  });
});
