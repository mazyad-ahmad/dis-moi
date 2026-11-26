import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { liveQuery } from 'dexie';
import { StrictMode } from 'react';
import { App } from '../app/App';
import { db } from '../data/db';
import { clearRecords, listRecords, startRecord, updateRecord } from '../data/history';
import { loadSettings } from '../data/settings';

beforeEach(async () => {
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
  window.location.hash = '';
});

describe('Étoiles après la remise à zéro (#143)', () => {
  it('affiche « Pas encore d’étoiles », puis les étoiles gagnées ensuite', async () => {
    const user = userEvent.setup();
    await db.games.add({
      gameId: 'lettres',
      startedAt: 1,
      updatedAt: 1,
      played: 10,
      rounds: 10,
      stars: 4,
      playerIds: [],
    } as never);
    window.location.hash = '#/etoiles';
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(await screen.findByText('4 étoiles')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Parent' }));

    await user.click(screen.getByRole('button', { name: 'Remettre les étoiles à zéro' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Remettre à zéro' }));
    expect(await screen.findByText('Les étoiles sont remises à zéro.')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Étoiles' }));
    expect(await screen.findByText("Pas encore d'étoiles")).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Jeux' }));
    await user.click(await screen.findByText('Quelle lettre ?'));
    for (let i = 0; i < 10; i++)
      await user.click(screen.getByRole('button', { name: i < 3 ? 'Trouvé' : 'Passer' }));
    expect(
      await screen.findByRole('heading', { name: '3 étoiles gagnées ensemble !' }),
    ).toBeInTheDocument();

    // Retour sur l'onglet Étoiles, sans recharger l'appli.
    await user.click(screen.getByRole('link', { name: 'Accueil' }));
    await user.click(await screen.findByRole('link', { name: 'Étoiles' }));
    expect(await screen.findByText('3 étoiles')).toBeInTheDocument();
    expect(screen.queryByText("Pas encore d'étoiles")).not.toBeInTheDocument();
  }, 20_000); // Une partie entière, écran par écran.
});

describe('Remise à zéro et requêtes en direct (#143)', () => {
  it('une requête déjà ouverte voit l’historique vide, puis la partie suivante', async () => {
    await db.games.add({
      gameId: 'lettres',
      startedAt: 1,
      updatedAt: 1,
      played: 10,
      rounds: 10,
      stars: 4,
      playerIds: [],
    } as never);
    const seen: number[][] = [];
    const sub = liveQuery(listRecords).subscribe((r) => seen.push(r.map((g) => g.stars)));
    await waitFor(() => expect(seen.at(-1)).toEqual([4]));

    await clearRecords();
    await waitFor(() => expect(seen.at(-1)).toEqual([]));

    const id = await startRecord({ gameId: 'dessin', played: 1, rounds: 10, stars: 0 });
    await updateRecord(id, { played: 2, stars: 2 });
    await waitFor(() => expect(seen.at(-1)).toEqual([2]));
    sub.unsubscribe();
  });

  it('montre le titre de l’onglet pendant la lecture, jamais une page blanche', () => {
    window.location.hash = '#/etoiles';
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Étoiles' })).toBeInTheDocument();
  });
});
