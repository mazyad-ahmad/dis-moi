import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';

beforeEach(async () => {
  await db.players.clear();
  await db.settings.clear();
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
  expect(await screen.findByText('Léa · Sami')).toBeInTheDocument();
});

it('applique le thème choisi dans l’espace parent', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/parent';
  render(<App />);
  await user.click(screen.getByLabelText('Nuit'));
  await waitFor(() => expect(document.documentElement.dataset.theme).toBe('night'));
  await user.click(screen.getByLabelText('Auto'));
  await waitFor(() => expect(document.documentElement.dataset.theme).toBeUndefined());
});
