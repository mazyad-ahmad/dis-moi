import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
});

const tick = () => new Promise((r) => setTimeout(r, 0));

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

/**
 * Rafraîchissement simulé : React perd tout son état, `sessionStorage` reste.
 * (Un vrai rafraîchissement ne démonte rien ; ici le démontage efface, on remet la copie.)
 */
async function reload(app: ReturnType<typeof render>) {
  const saved = Object.fromEntries(
    Array.from({ length: sessionStorage.length }, (_, i) => {
      const k = sessionStorage.key(i)!;
      return [k, sessionStorage.getItem(k)!];
    }),
  );
  app.unmount();
  await tick();
  for (const [k, v] of Object.entries(saved)) sessionStorage.setItem(k, v);
  return render(<App />);
}

it('Quelle lettre : reprend la même carte, la même manche et la même partie', async () => {
  const user = userEvent.setup();
  let app = open('/jeu/lettres');
  await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  await user.click(screen.getByRole('button', { name: 'Passer' }));
  await user.click(screen.getByLabelText('Chiffres'));
  const glyph = screen.getByTestId('glyph').textContent;
  await waitFor(async () => expect(await db.games.count()).toBe(1));
  await waitFor(() => expect(sessionStorage.getItem('dis-moi:partie:lettres')).toMatch(/record/));

  app = await reload(app);
  expect(screen.getByText('Manche 3 sur 10')).toBeInTheDocument();
  expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Quel chiffre ?' })).toBeInTheDocument();
  expect(screen.getByTestId('glyph')).toHaveTextContent(glyph!);

  await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  await waitFor(async () =>
    expect(await db.games.toArray()).toMatchObject([{ played: 3, stars: 2 }]),
  );
  app.unmount();
});

it('Quelle chanson : reprend la même chanson', async () => {
  const user = userEvent.setup();
  let app = open('/jeu/chanson');
  await user.click(screen.getByRole('button', { name: 'Pas encore' }));
  await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
  const title = screen.getByText(/^Indice :/).parentElement!.textContent;

  app = await reload(app);
  expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
  expect(screen.getByText(/^Indice :/).parentElement).toHaveTextContent(title!);
  app.unmount();
});

it('quitter le jeu efface la partie en cours : on revient sur une nouvelle partie', async () => {
  const user = userEvent.setup();
  open('/jeu/lettres');
  await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  expect(sessionStorage.getItem('dis-moi:partie:lettres')).not.toBeNull();
  await user.click(screen.getByRole('link', { name: 'Quitter la partie' }));
  await screen.findByRole('heading', { name: 'On joue à quoi ?' });
  await tick();
  expect(sessionStorage.getItem('dis-moi:partie:lettres')).toBeNull();
});

it('la fin de partie efface la partie en cours, « Rejouer » refait un tirage', async () => {
  const user = userEvent.setup();
  open('/jeu/lettres');
  for (let i = 0; i < 10; i++) await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  expect(
    screen.getByRole('heading', { name: '10 étoiles gagnées ensemble !' }),
  ).toBeInTheDocument();
  expect(sessionStorage.getItem('dis-moi:partie:lettres')).toBeNull();

  await user.click(screen.getByRole('button', { name: 'Rejouer' }));
  await tick();
  expect(screen.getByText('Manche 1 sur 10')).toBeInTheDocument();
  expect(JSON.parse(sessionStorage.getItem('dis-moi:partie:lettres')!)).toMatchObject({
    progress: { played: 0, stars: 0 },
  });
});

it('un état sauvegardé illisible donne une nouvelle partie', async () => {
  sessionStorage.setItem(
    'dis-moi:partie:lettres',
    JSON.stringify({ letters: ['?'], progress: { played: 4, stars: 2 } }),
  );
  open('/jeu/lettres');
  expect(screen.getByText('Manche 1 sur 10')).toBeInTheDocument();
  expect(screen.getByTestId('glyph').textContent).toMatch(/^[A-Z]$/);
});
