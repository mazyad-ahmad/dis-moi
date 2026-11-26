import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';
import { addPlayer, listActivePlayers } from '../data/players';
import { loadSettings } from '../data/settings';

beforeEach(async () => {
  await db.players.clear();
  await db.settings.clear();
  await loadSettings();
  window.location.hash = '';
});

it('affiche l’accueil avec les trois jeux et la navigation', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'On joue à quoi ?' })).toBeInTheDocument();
  for (const name of ['Quelle chanson ?', 'Quelle lettre ?', 'Dessine ça', 'Ajouter un jeu'])
    expect(screen.getByText(name)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Jeux' })).toHaveAttribute('aria-current', 'page');
  expect(await screen.findByText('Ajoute le prénom des enfants')).toBeInTheDocument();
});

it('ajoute des joueurs et les affiche sur l’accueil', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/joueurs';
  render(<App />);
  const input = screen.getByPlaceholderText('Prénom');
  await user.type(input, 'Léa{Enter}');
  await user.type(input, 'Sami{Enter}');
  expect(await screen.findByLabelText('Prénom de Sami')).toBeInTheDocument();

  await user.type(input, 'Léa{Enter}');
  expect(await screen.findByRole('alert')).toHaveTextContent('Léa est déjà dans la liste.');

  await user.click(screen.getByRole('link', { name: 'Retour' }));
  await user.click(await screen.findByRole('button', { name: /La partie/ }));
  const group = await screen.findByRole('group', { name: 'Qui joue ?' });
  expect(within(group).getByRole('button', { name: 'Léa' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(within(group).getByRole('button', { name: 'Sami' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

it('choisit qui joue aujourd’hui avec les pastilles, au clavier, et garde le choix', async () => {
  const user = userEvent.setup();
  const lea = await addPlayer('Léa');
  const sami = await addPlayer('Sami');
  const view = render(<App />);
  await user.click(await screen.findByRole('button', { name: /La partie/ }));
  const samiBtn = await screen.findByRole('button', { name: 'Sami' });

  // Tab jusqu'à la pastille de Sami, puis Espace : elle n'est plus appuyée.
  samiBtn.focus();
  await user.keyboard(' ');
  expect(samiBtn).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { name: 'Léa' })).toHaveAttribute('aria-pressed', 'true');
  await waitFor(async () => expect((await listActivePlayers()).map((p) => p.id)).toEqual([lea]));

  // Le choix est gardé d'une partie à l'autre (et après un rechargement).
  view.unmount();
  await loadSettings();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /La partie/ }));
  expect(await screen.findByRole('button', { name: 'Sami' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  await user.click(screen.getByRole('button', { name: 'Sami' }));
  expect(screen.getByRole('button', { name: 'Sami' })).toHaveAttribute('aria-pressed', 'true');
  await waitFor(async () =>
    expect((await listActivePlayers()).map((p) => p.id)).toEqual([lea, sami]),
  );
});

it('choisit l’animal à la création, le change ensuite, et l’affiche sur l’accueil', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/joueurs';
  render(<App />);
  await user.click(screen.getByRole('button', { name: /Choisir l’avatar du nouveau joueur/ }));
  const dialog = await screen.findByRole('dialog', { name: 'L’animal de Nouveau joueur' });
  await user.click(within(dialog).getByRole('radio', { name: 'tortue' }));
  await user.click(within(dialog).getByRole('radio', { name: 'violet' }));
  await user.click(within(dialog).getByRole('button', { name: 'C’est bon' }));
  await user.type(screen.getByPlaceholderText('Prénom'), 'Léa{Enter}');

  const change = await screen.findByRole('button', { name: 'Changer l’avatar de Léa, tortue' });
  expect(await db.players.toArray()).toMatchObject([{ animal: 'tortue', color: 'lilac' }]);
  await user.click(change);
  await user.click(await screen.findByRole('radio', { name: 'renard' }));
  await user.click(screen.getByRole('button', { name: 'C’est bon' }));
  expect(
    await screen.findByRole('button', { name: 'Changer l’avatar de Léa, renard' }),
  ).toBeInTheDocument();

  await user.click(screen.getByRole('link', { name: 'Retour' }));
  await user.click(await screen.findByRole('button', { name: /La partie/ }));
  expect(await screen.findByRole('button', { name: 'Léa' })).toHaveTextContent('🦊');
});

it('niveau de la partie sur l’accueil (Tous par défaut) et niveau de chaque joueur', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /La partie/ }));
  expect(screen.getByLabelText('Tous')).toBeChecked();
  await user.click(screen.getByLabelText('Grands'));
  expect(screen.getByText('7 ans et plus')).toBeInTheDocument();
  await waitFor(async () =>
    expect(await db.settings.get('gameLevel')).toEqual({ key: 'gameLevel', value: 3 }),
  );
  await user.click(screen.getByLabelText('Tous'));
  await waitFor(async () => expect((await db.settings.get('gameLevel'))?.value).toBeNull());

  await user.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Ajouter' }));
  await user.type(screen.getByPlaceholderText('Prénom'), 'Léa{Enter}');
  const group = await screen.findByRole('group', { name: 'Niveau de Léa' });
  expect(within(group).getByLabelText('Moyens')).not.toBeChecked();
  await user.click(within(group).getByLabelText('Moyens'));
  await waitFor(async () => expect((await db.players.toArray())[0].level).toBe(2));
  expect(within(group).getByText('5-6 ans')).toBeInTheDocument();
});

it('applique le thème choisi dans l’espace parent', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/parent/apparence';
  render(<App />);
  await user.click(screen.getByLabelText('Nuit'));
  await waitFor(() => expect(document.documentElement.dataset.theme).toBe('night'));
  await user.click(screen.getByLabelText('Auto'));
  await waitFor(() => expect(document.documentElement.dataset.theme).toBeUndefined());
});
