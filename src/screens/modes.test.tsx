import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';
import { loadSettings, setSetting } from '../data/settings';

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const modes = () => screen.getByRole('group', { name: 'Façon de jouer' });

it('Normal par défaut ; Voiture ne propose que des jeux oraux', async () => {
  const user = userEvent.setup();
  await setSetting('catalogue', ['animal', 'couleur', 'mime', 'devinette']);
  open('/');
  await user.click(await screen.findByRole('button', { name: /La partie/ }));
  expect(await screen.findByRole('radio', { name: 'Normal' })).toBeChecked();
  expect(screen.getByRole('link', { name: /Quelle lettre/ })).toBeInTheDocument();

  await user.click(within(modes()).getByRole('radio', { name: 'Voiture' }));
  expect(screen.getByText('Tout à l’oral, rien à regarder.')).toBeInTheDocument();
  const grid = screen.getAllByRole('link').map((a) => a.textContent);
  for (const shown of ['Quelle chanson', 'Quel animal', 'Devinettes', 'Le Grand Jeu'])
    expect(grid.some((t) => t?.includes(shown))).toBe(true);
  for (const hidden of ['Quelle lettre', 'Dessine ça', 'Quelle couleur', 'Mime ça'])
    expect(grid.some((t) => t?.includes(hidden))).toBe(false);
});

it('Voiture : le Grand Jeu ne tire que des jeux oraux', async () => {
  const user = userEvent.setup();
  await setSetting('catalogue', ['animal', 'mime', 'devinette']);
  await setSetting('gameMode', 'voiture');
  await setSetting('rounds', 10);
  open('/jeu/grand-jeu');
  for (let i = 1; i <= 10; i++) {
    expect(await screen.findByText(`Manche ${i} sur 10`)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(
      /^(Quelle chanson \?|Quel animal \?|Devinettes)$/,
    );
    const flash = screen.queryByRole('button', { name: /Maintenant : / });
    if (flash) await user.click(flash);
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  }
});

it('Express : 3 manches, mode noté dans la partie et l’historique', async () => {
  const user = userEvent.setup();
  await setSetting('gameMode', 'express');
  open('/jeu/lettres');
  for (let i = 1; i <= 3; i++) {
    expect(await screen.findByText(`Manche ${i} sur 3`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  }
  expect(screen.getByRole('heading', { name: '3 étoiles gagnées ensemble !' })).toBeInTheDocument();
  await waitFor(async () =>
    expect(await db.games.toArray()).toMatchObject([
      { gameId: 'lettres', rounds: 3, played: 3, stars: 3, mode: 'express' },
    ]),
  );
  await user.click(screen.getByRole('link', { name: 'Accueil' }));
  await user.click(await screen.findByRole('link', { name: 'Étoiles' }));
  const history = await screen.findByRole('region', { name: 'Dernières parties' });
  expect(within(history).getByText(/Express/)).toBeInTheDocument();
});

it('une partie normale est notée « normal »', async () => {
  const user = userEvent.setup();
  await setSetting('rounds', 5);
  open('/jeu/lettres');
  await user.click(await screen.findByRole('button', { name: 'Trouvé' }));
  await waitFor(async () =>
    expect(await db.games.toArray()).toMatchObject([{ gameId: 'lettres', mode: 'normal' }]),
  );
});

describe('Coucher', () => {
  it('impose le thème nuit et cache le mime', async () => {
    const user = userEvent.setup();
    await setSetting('catalogue', ['mime']);
    open('/');
    expect(await screen.findByRole('link', { name: /Mime ça/ })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /La partie/ }));
    await user.click(within(modes()).getByRole('radio', { name: 'Coucher' }));
    expect(document.documentElement.dataset.theme).toBe('night');
    expect(screen.queryByRole('link', { name: /Mime ça/ })).not.toBeInTheDocument();
    await user.click(within(modes()).getByRole('radio', { name: 'Normal' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('ne lance pas le mime ouvert par l’adresse', async () => {
    await setSetting('catalogue', ['mime']);
    await setSetting('gameMode', 'coucher');
    open('/jeu/mime');
    expect(await screen.findByText('Ce jeu ne se joue pas en mode Coucher')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Trouvé' })).not.toBeInTheDocument();
  });

  it('Dessine ça sans minuteur, puis une fin en douceur', async () => {
    const user = userEvent.setup();
    await setSetting('gameMode', 'coucher');
    await setSetting('rounds', 5);
    open('/jeu/dessin');
    expect(await screen.findByText('Manche 1 sur 5')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    for (let i = 1; i <= 5; i++)
      await user.click(screen.getByRole('button', { name: "C'est fini" }));
    expect(await screen.findByText('C’est l’heure de dormir. Bonne nuit !')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Un autre jeu/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejouer' })).toBeInTheDocument();
  });
});
