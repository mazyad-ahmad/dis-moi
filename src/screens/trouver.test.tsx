import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { createCustomGame } from '../data/customGames';
import { db } from '../data/db';
import { addPlayer, setPlayerLevel } from '../data/players';
import { loadSettings, setSetting } from '../data/settings';

// #137 : trouver le bon jeu (types, âges, moments).

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.customGames.clear()]);
  await loadSettings();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const shownGames = () =>
  within(screen.getByRole('region', { name: 'Catalogue' }))
    .queryAllByRole('button', { name: /^(Ajouter|Retirer) (?!les filtres)/ })
    .map((b) => b.getAttribute('aria-label')!.replace(/^(Ajouter|Retirer) /, ''));

it('Ajouter un jeu : groupé par type, avec âge et ce que le jeu fait travailler', async () => {
  open('/ajouter');
  const catalogue = await screen.findByRole('region', { name: 'Catalogue' });
  for (const type of ['Écouter', 'Parler', 'Bouger'])
    expect(within(catalogue).getByRole('heading', { name: type })).toBeInTheDocument();
  expect(within(catalogue).getByText(/Fait bouger et s’exprimer/)).toBeInTheDocument();
  expect(within(catalogue).getAllByText(/Dès 3 ans/).length).toBeGreaterThan(0);
  expect(shownGames()).toHaveLength(18);
  // Recherche seulement au-delà de 20 jeux.
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
});

it('les filtres se cumulent, se retirent d’un geste et sont nommés pour le lecteur d’écran', async () => {
  const user = userEvent.setup();
  open('/ajouter');
  const types = await screen.findByRole('group', { name: 'Type' });
  const ages = screen.getByRole('group', { name: 'Âge' });
  const moments = screen.getByRole('group', { name: 'Moment' });
  const status = within(screen.getByRole('region', { name: 'Catalogue' })).getByRole('status');
  expect(status).toHaveTextContent('');

  const parler = within(types).getByRole('button', { name: 'Parler' });
  await user.click(parler);
  expect(parler).toHaveAttribute('aria-pressed', 'true');
  expect(shownGames()).toEqual([
    'Quel animal ?',
    'Vrai ou faux rigolo',
    'Quelle couleur ?',
    'Devinettes',
    'Quelle émotion ?',
    'Ça rime avec…',
    'Les contraires',
    'Ombres',
    'Devine-tête',
    'Où ça va ?',
    'Mime l’émotion',
  ]);
  expect(status).toHaveTextContent('11 jeux sur 18');

  await user.click(within(moments).getByRole('button', { name: 'Pour la voiture' }));
  const oral = [
    'Quel animal ?',
    'Vrai ou faux rigolo',
    'Devinettes',
    'Ça rime avec…',
    'Les contraires',
    'Où ça va ?',
  ];
  expect(shownGames()).toEqual(oral);
  await user.click(within(ages).getByRole('button', { name: '7 ans et plus' }));
  expect(shownGames()).toEqual(oral);

  // Un geste : toucher de nouveau la pastille choisie la retire.
  await user.click(parler);
  expect(parler).toHaveAttribute('aria-pressed', 'false');
  // La chasse au trésor se joue sans courir en voiture.
  expect(shownGames()).toEqual([
    'Quel animal ?',
    'Vrai ou faux rigolo',
    'Devinettes',
    'Ça rime avec…',
    'Les contraires',
    'Où ça va ?',
    'Tape les syllabes',
    'Chasse au trésor',
  ]);

  // Ou tout retirer d'un coup.
  await user.click(screen.getByRole('button', { name: 'Retirer les filtres' }));
  expect(shownGames()).toHaveLength(18);
  expect(status).toHaveTextContent('');
  for (const group of [types, ages, moments])
    expect(within(group).queryAllByRole('button', { pressed: true })).toHaveLength(0);
});

it('Pour le coucher : pas de jeu qui fait bouger', async () => {
  const user = userEvent.setup();
  open('/ajouter');
  await user.click(await screen.findByRole('button', { name: 'Pour le coucher' }));
  expect(shownGames()).not.toContain('Mime ça');
  expect(shownGames()).toContain('Devinettes');
});

it('un jeu créé reçoit un type et un âge facultatif', async () => {
  const user = userEvent.setup();
  open('/ajouter');
  await user.type(await screen.findByLabelText('Nom du jeu'), 'Respirer');
  const type = screen.getByRole('radiogroup', { name: 'Ce que fait l’enfant' });
  // Type proposé d'après la façon de jouer (Question → Parler).
  expect(within(type).getByRole('radio', { name: 'Parler' })).toBeChecked();
  await user.click(within(type).getByRole('radio', { name: 'Se calmer' }));
  const age = screen.getByRole('radiogroup', { name: 'Âge (facultatif)' });
  expect(within(age).getByRole('radio', { name: 'Tous âges' })).toBeChecked();
  await user.click(within(age).getByRole('radio', { name: '3-4 ans' }));
  await user.click(screen.getByRole('button', { name: 'Ajouter les questions' }));
  await waitFor(async () =>
    expect(await db.customGames.toArray()).toMatchObject([
      { name: 'Respirer', kind: 'question', activity: 'calme', level: 1 },
    ]),
  );
});

it('sans joueur ni âge, l’accueil montre tous les jeux dans une seule grille', async () => {
  await createCustomGame('Quiz des grands', 'question', { level: 3 });
  open('/');
  expect(await screen.findByRole('link', { name: /Quiz des grands/ })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Pour d’autres âges' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Ajouter un jeu/ })).toBeInTheDocument();
});

it('l’accueil met en haut les jeux des joueurs du jour, sans cacher les autres', async () => {
  const lea = await addPlayer('Léa');
  await setPlayerLevel(lea, 1);
  await createCustomGame('Quiz des grands', 'question', { level: 3 });
  await createCustomGame('Comptines', 'sound', { level: 1 });
  open('/');
  const others = await screen.findByRole('region', { name: 'Pour d’autres âges' });
  expect(within(others).getByRole('link', { name: /Quiz des grands/ })).toBeInTheDocument();
  expect(within(others).queryByRole('link', { name: /Comptines/ })).not.toBeInTheDocument();
  const links = screen.getAllByRole('link').map((a) => a.textContent ?? '');
  const index = (name: string) => links.findIndex((t) => t.includes(name));
  expect(index('Comptines')).toBeLessThan(index('Quiz des grands'));

  // Le niveau de la partie l'emporte sur celui des joueurs.
  await setSetting('gameLevel', 3);
  await waitFor(() =>
    expect(
      within(screen.getByRole('region', { name: 'Pour d’autres âges' })).getByRole('link', {
        name: /Comptines/,
      }),
    ).toBeInTheDocument(),
  );
});

it('avec beaucoup de jeux, l’accueil les range par type', async () => {
  await setSetting('catalogue', ['animal', 'couleur', 'mime', 'devinette']);
  open('/');
  for (const type of ['Écouter', 'Parler', 'Lire et compter', 'Dessiner', 'Bouger'])
    expect(await screen.findByRole('heading', { name: type })).toBeInTheDocument();
  expect(
    within(screen.getByRole('region', { name: 'Bouger' })).getByRole('link', { name: /Mime ça/ }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Ajouter un jeu/ })).toBeInTheDocument();
});
