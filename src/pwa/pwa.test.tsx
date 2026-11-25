import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';
import { useRounds } from '../games/useRounds';
import { resetPwa } from './pwa';
import { useWakeLock } from './useWakeLock';

beforeEach(async () => {
  await db.settings.clear();
  window.location.hash = '';
  resetPwa();
});

describe('mise à jour', () => {
  it('propose la nouvelle version et ne l’active qu’à la demande', async () => {
    const user = userEvent.setup();
    const postMessage = vi.fn();
    render(<App />);
    expect(screen.queryByText(/nouvelle version/)).not.toBeInTheDocument();

    act(() => resetPwa({ waiting: { postMessage } as unknown as ServiceWorker }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Une nouvelle version de Dis\u2011moi est prête.',
    );
    expect(postMessage).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Mettre à jour' }));
    expect(postMessage).toHaveBeenCalledWith('skip-waiting');
  });
});

describe('installation', () => {
  it('bouton « Installer l’appli » quand Chrome le propose', async () => {
    const user = userEvent.setup();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const install = {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    } as unknown as NonNullable<Parameters<typeof resetPwa>[0]>['install'];
    window.location.hash = '#/parent';
    render(<App />);
    expect(screen.getByText(/Ajouter à l’écran d’accueil/)).toBeInTheDocument();

    act(() => resetPwa({ install }));
    await user.click(screen.getByRole('button', { name: 'Installer l’appli' }));
    expect(prompt).toHaveBeenCalled();
    // Installée : la section disparaît.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Installer l’appli' })).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(/Ajouter à l’écran d’accueil/)).not.toBeInTheDocument();
  });
});

describe('page Confidentialité', () => {
  it('est accessible depuis l’espace Parent', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/parent';
    render(<App />);
    await user.click(screen.getByRole('link', { name: 'Confidentialité' }));
    expect(screen.getByRole('heading', { name: 'Confidentialité' })).toBeInTheDocument();
    expect(screen.getByText(/ne collecte aucune donnée/)).toBeInTheDocument();
    expect(screen.getByText(/pas de publicité/)).toBeInTheDocument();
  });
});

describe('écran allumé (Wake Lock)', () => {
  const release = vi.fn().mockResolvedValue(undefined);
  const request = vi.fn();

  beforeEach(() => {
    release.mockClear();
    request.mockReset().mockImplementation(async () => ({ released: false, release }));
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  });
  afterEach(() => {
    delete (navigator as { wakeLock?: unknown }).wakeLock;
  });

  it('verrouille pendant la partie et libère à la fin', async () => {
    const { result } = renderHook(() => useRounds('test', 2));
    await act(async () => undefined);
    expect(request).toHaveBeenCalledWith('screen');

    await act(async () => result.current.answer(true));
    expect(release).not.toHaveBeenCalled();
    await act(async () => result.current.answer(false));
    expect(result.current).toMatchObject({ finished: true, stars: 1, round: 2 });
    expect(release).toHaveBeenCalled();
  });

  it('reprend le verrou au retour au premier plan', async () => {
    let released = false;
    request.mockImplementation(async () => ({
      get released() {
        return released;
      },
      release,
    }));
    renderHook(() => useWakeLock(true));
    await act(async () => undefined);
    expect(request).toHaveBeenCalledTimes(1);

    // Android libère le verrou quand l'appli passe en arrière-plan.
    released = true;
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('ne fait rien sans Wake Lock API', () => {
    delete (navigator as { wakeLock?: unknown }).wakeLock;
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
  });
});

describe('manches', () => {
  it('compte les étoiles et ne dépasse pas le nombre de manches', async () => {
    const { result } = renderHook(() => useRounds('test', 3));
    expect(result.current).toMatchObject({ round: 1, rounds: 3, stars: 0, finished: false });
    for (const found of [true, false, true, true])
      await act(async () => result.current.answer(found));
    expect(result.current).toMatchObject({ round: 3, stars: 2, finished: true });
    const records = await db.games.where('gameId').equals('test').toArray();
    expect(records.at(-1)).toMatchObject({ played: 3, stars: 2, rounds: 3 });
  });
});
