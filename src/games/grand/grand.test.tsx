import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { FLASH_MS } from './GrandGame';

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const title = () => screen.getByRole('heading', { level: 1 }).textContent;

it('tuile de l’accueil vers le Grand Jeu', async () => {
  open('/');
  expect(await screen.findByRole('link', { name: /Le Grand Jeu/ })).toHaveAttribute(
    'href',
    '#/jeu/grand-jeu',
  );
});

it('annonce le jeu de chaque manche, change de jeu et enregistre la partie', async () => {
  const user = userEvent.setup();
  await setSetting('rounds', 5);
  open('/jeu/grand-jeu');

  const titles: string[] = [];
  for (let i = 1; i <= 5; i++) {
    expect(await screen.findByText(`Manche ${i} sur 5`)).toBeInTheDocument();
    titles.push(title()!);
    // Écran-éclair « Maintenant : … » (il passe aussi tout seul).
    const flash = screen.queryByRole('button', { name: /Maintenant : / });
    if (flash) await user.click(flash);
    await user.click(screen.getByRole('button', { name: /^(Trouvé|C'est fini)$/ }));
  }
  // Trois jeux de base : jamais deux fois le même de suite (« Quel chiffre ? » = « Quelle lettre ? »).
  const games = titles.map((t) => t.replace('Quel chiffre ?', 'Quelle lettre ?'));
  games.forEach((t, i) => i > 0 && expect(t).not.toBe(games[i - 1]));

  expect(screen.getByRole('heading', { name: '5 étoiles gagnées ensemble !' })).toBeInTheDocument();
  await waitFor(async () =>
    expect(await db.games.toArray()).toMatchObject([
      { gameId: 'grand-jeu', played: 5, rounds: 5, stars: 5 },
    ]),
  );

  await user.click(screen.getByRole('link', { name: 'Accueil' }));
  await user.click(await screen.findByRole('link', { name: 'Étoiles' }));
  const history = await screen.findByRole('region', { name: 'Dernières parties' });
  expect(within(history).getByText('Le Grand Jeu')).toBeInTheDocument();
});

it('l’écran-éclair laisse place à la manche tout seul', async () => {
  open('/jeu/grand-jeu');
  expect(await screen.findByRole('button', { name: /Maintenant : / })).toBeInTheDocument();
  expect(
    await screen.findByRole(
      'button',
      { name: /^(Trouvé|C'est fini)$/ },
      { timeout: FLASH_MS + 1000 },
    ),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Maintenant : / })).not.toBeInTheDocument();
});

describe('manches de dessin', () => {
  afterEach(() => vi.useRealTimers());

  it('gardent leur minuteur', async () => {
    // Deux jeux seulement : Quelle lettre ? et Dessine ça, en alternance.
    await setSetting('grandExcluded', ['chanson']);
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    open('/jeu/grand-jeu');
    await screen.findByText('Manche 1 sur 10');
    for (let i = 0; i < 2; i++) {
      await user.click(screen.getByRole('button', { name: /C’est parti/ }));
      if (title() === 'Dessine ça') break;
      await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    }
    expect(title()).toBe('Dessine ça');
    expect(screen.getByRole('timer')).toHaveTextContent('1:00');
    act(() => void vi.advanceTimersByTime(20_000));
    expect(screen.getByRole('timer')).toHaveTextContent('0:40');
    expect(screen.getByRole('button', { name: 'Autre mot' })).toBeInTheDocument();
  });
});

it('l’espace Parent mémorise les jeux inclus, deux au moins', async () => {
  const user = userEvent.setup();
  open('/parent');
  const song = await screen.findByRole('button', { name: 'Quelle chanson ? dans Le Grand Jeu' });
  expect(song).toHaveAttribute('aria-pressed', 'true');
  await user.click(song);
  expect(song).toHaveAttribute('aria-pressed', 'false');
  await waitFor(async () =>
    expect(await db.settings.get('grandExcluded')).toMatchObject({ value: ['chanson'] }),
  );
  // Plus que deux jeux : on ne peut plus en retirer.
  expect(screen.getByRole('button', { name: 'Dessine ça dans Le Grand Jeu' })).toBeDisabled();
  await user.click(song);
  expect(screen.getByRole('button', { name: 'Dessine ça dans Le Grand Jeu' })).toBeEnabled();
});

it('reprend la partie après un rafraîchissement : même manche, même jeu', async () => {
  const user = userEvent.setup();
  const view = open('/jeu/grand-jeu');
  await screen.findByText('Manche 1 sur 10');
  const flash = screen.queryByRole('button', { name: /Maintenant : / });
  if (flash) await user.click(flash);
  await user.click(screen.getByRole('button', { name: /^(Trouvé|C'est fini)$/ }));
  const second = title();
  // Rafraîchissement simulé : le démontage efface la partie, on remet la copie.
  const saved = sessionStorage.getItem('dis-moi:partie:grand-jeu')!;
  view.unmount();
  await act(() => new Promise((r) => setTimeout(r, 0)));
  sessionStorage.setItem('dis-moi:partie:grand-jeu', saved);
  open('/jeu/grand-jeu');
  expect(await screen.findByText('Manche 2 sur 10')).toBeInTheDocument();
  expect(title()).toBe(second);
  expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
  await screen.findByRole(
    'button',
    { name: /^(Trouvé|C'est fini)$/ },
    { timeout: FLASH_MS + 1000 },
  );
  await waitFor(async () => expect(await db.games.count()).toBe(1));
});
