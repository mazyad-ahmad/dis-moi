import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { App } from '../app/App';
import { db } from '../data/db';
import { lock } from '../data/parentLock';
import { resetSeance } from '../data/seance';
import { loadSettings, setSetting } from '../data/settings';

const MIN = 60_000;
let clock = Date.now();

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
  await setSetting('rounds', 5);
  lock();
  resetSeance();
  clock = Date.now();
  vi.spyOn(Date, 'now').mockImplementation(() => clock);
  window.location.hash = '';
});

afterEach(() => vi.restoreAllMocks());

function go(path: string) {
  act(() => {
    window.location.hash = `#${path}`;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

/** Une partie de Quelle lettre qui dure `minutes` minutes. */
async function playLetters(user: ReturnType<typeof userEvent.setup>, minutes: number) {
  for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  clock += minutes * MIN;
  await user.click(screen.getByRole('button', { name: 'Trouvé' }));
}

it('réglage désactivé : on rejoue sans limite', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/jeu/lettres';
  render(<App />);
  await playLetters(user, 60);
  expect(screen.getByRole('button', { name: 'Rejouer' })).toBeInTheDocument();
  expect(screen.queryByText(/on range/)).not.toBeInTheDocument();
});

it('annonce la dernière partie, la laisse finir, puis propose de ranger', async () => {
  await setSetting('sessionMinutes', 10);
  const user = userEvent.setup();
  window.location.hash = '#/jeu/lettres';
  render(<App />);

  await playLetters(user, 4);
  expect(screen.queryByText(/on range/)).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Rejouer' }));

  await playLetters(user, 4);
  expect(screen.getByText('Encore une partie, et après on range.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Rejouer' }));
  expect(screen.getByText('Dernière partie, et après on range.')).toBeInTheDocument();

  // Bien après l'échéance, la partie va jusqu'au bout.
  await playLetters(user, 10);
  expect(screen.getByRole('heading', { name: 'C’était la dernière partie !' })).toBeInTheDocument();
  expect(screen.getByText('On range le téléphone ?')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Rejouer' })).not.toBeInTheDocument();
  expect(screen.queryByText(/\d+:\d\d|minutes? restantes?/)).not.toBeInTheDocument();

  // L'accueil ne propose plus que « Revenir plus tard ».
  go('/');
  expect(screen.getByRole('heading', { name: 'Revenir plus tard' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Quelle lettre/ })).not.toBeInTheDocument();

  // Même par l'adresse, pas de nouvelle partie.
  go('/jeu/devinette');
  expect(screen.queryByRole('button', { name: 'Trouvé' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Revenir plus tard' })).toBeInTheDocument();

  // Le parent prolonge depuis son espace.
  go('/parent');
  expect(screen.getByText('La séance est terminée.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Prolonger de 10 minutes' }));
  go('/');
  expect(screen.getByRole('link', { name: /Quelle lettre/ })).toBeInTheDocument();
});

it('verrou actif : l’enfant seul ne peut pas prolonger', async () => {
  await setSetting('sessionMinutes', 10);
  await setSetting('parentLock', true);
  const user = userEvent.setup();
  window.location.hash = '#/jeu/lettres';
  render(<App />);
  await playLetters(user, 12);
  expect(screen.getByRole('heading', { name: 'C’était la dernière partie !' })).toBeInTheDocument();

  go('/parent');
  expect(screen.getByRole('textbox', { name: /^Combien font/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Prolonger/ })).not.toBeInTheDocument();
});

it('une pause de plus de 30 minutes rouvre les jeux', async () => {
  await setSetting('sessionMinutes', 10);
  const user = userEvent.setup();
  window.location.hash = '#/jeu/lettres';
  render(<App />);
  await playLetters(user, 12);
  clock += 31 * MIN;
  go('/');
  expect(screen.getByRole('link', { name: /Quelle lettre/ })).toBeInTheDocument();
});
