import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';
import { addItem, createCustomGame } from '../data/customGames';
import { addPlayer } from '../data/players';
import { getSettings, loadSettings, setSetting } from '../data/settings';

beforeEach(async () => {
  await Promise.all([
    db.players.clear(),
    db.settings.clear(),
    db.games.clear(),
    db.customGames.clear(),
  ]);
  await loadSettings();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => vi.restoreAllMocks());

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

async function playAll(user: ReturnType<typeof userEvent.setup>, found: string, n: number) {
  for (let i = 1; i <= n; i++) {
    expect(screen.getByText(`Manche ${i} sur ${n}`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: found }));
  }
}

describe('Ajouter un jeu : catalogue', () => {
  it('ajoute et retire un jeu du catalogue sur l’accueil', async () => {
    const user = userEvent.setup();
    open('/ajouter');
    expect(screen.getByText("3 jeux dans l'appli")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ajouter Devinettes' }));
    expect(screen.getByRole('button', { name: 'Retirer Devinettes' })).toHaveTextContent('Ajouté');
    expect(screen.getByText("4 jeux dans l'appli")).toBeInTheDocument();
    expect(getSettings().catalogue).toEqual(['devinette']);

    await user.click(screen.getByRole('link', { name: 'Retour' }));
    expect(await screen.findByRole('link', { name: /Devinettes/ })).toHaveAttribute(
      'href',
      '#/jeu/devinette',
    );

    // Les réglages sont bien écrits dans la base.
    await loadSettings();
    expect(getSettings().catalogue).toEqual(['devinette']);
  });

  it('Devinettes : question lue, réponse cachée, partie complète enregistrée', async () => {
    const user = userEvent.setup();
    open('/jeu/devinette');
    expect(screen.getByRole('heading', { name: 'Devinettes' })).toBeInTheDocument();
    expect(screen.getByText(/Qui suis-je \?$/)).toBeInTheDocument();
    expect(screen.getByText(/^Indice :/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    // Nouvelle manche : réponse de nouveau cachée.
    expect(screen.getByRole('button', { name: 'Voir la réponse' })).toBeInTheDocument();
    for (let i = 2; i <= 10; i++)
      await user.click(screen.getByRole('button', { name: 'Pas encore' }));
    expect(
      screen.getByRole('heading', { name: '1 étoile gagnées ensemble !' }),
    ).toBeInTheDocument();
    await waitFor(async () =>
      expect(await db.games.toArray()).toMatchObject([
        { gameId: 'devinette', stars: 1, played: 10 },
      ]),
    );
  });

  it('Quelle couleur et Quel animal affichent leur carte', async () => {
    const user = userEvent.setup();
    const view = open('/jeu/couleur');
    expect(screen.getByRole('img', { name: 'Couleur à nommer' })).toBeInTheDocument();
    view.unmount();

    open('/jeu/animal');
    expect(screen.getByText('Le parent fait le bruit, l’enfant devine')).toBeInTheDocument();
    expect(screen.getByText(/^À imiter :/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
    expect(screen.getByLabelText('Pour le parent')).toHaveTextContent(/^Pour le parent\S+ L/u);
  });
});

describe('Créer mon propre jeu', () => {
  it('crée un jeu de questions, ajoute des cartes et y joue', async () => {
    const user = userEvent.setup();
    open('/ajouter');
    await user.type(screen.getByLabelText('Nom du jeu'), 'Les bruits de la maison');
    await user.click(screen.getByLabelText('Question'));
    await user.click(screen.getByRole('button', { name: 'Ajouter les questions' }));

    expect(
      await screen.findByRole('heading', { name: 'Les bruits de la maison' }),
    ).toBeInTheDocument();
    expect(window.location.hash).toMatch(/^#\/creer\/\d+$/);
    expect(screen.getByRole('button', { name: 'Jouer' })).toBeDisabled();

    // Carte incomplète : message clair.
    await user.type(screen.getByLabelText('Réponse'), 'La porte');
    await user.click(screen.getByRole('button', { name: 'Ajouter la carte' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Écris la question.');

    await user.type(screen.getByLabelText('Question'), 'Qui fait « toc toc » ?');
    await user.click(screen.getByRole('button', { name: 'Ajouter la carte' }));
    expect(await screen.findByText('1 carte')).toBeInTheDocument();
    expect(screen.getByLabelText('Réponse')).toHaveValue('');

    await user.type(screen.getByLabelText('Question'), 'Qui sonne le matin ?');
    await user.type(screen.getByLabelText('Réponse'), 'Le réveil');
    await user.type(screen.getByLabelText(/Indice/), 'Il est sur la table de nuit');
    await user.click(screen.getByRole('button', { name: 'Ajouter la carte' }));
    expect(await screen.findByText('2 cartes')).toBeInTheDocument();

    // Modifier une carte.
    await user.click(screen.getByRole('button', { name: 'Modifier La porte' }));
    const form = screen.getByRole('form', { name: 'Modifier la carte' });
    await user.clear(within(form).getByLabelText('Réponse'));
    await user.type(within(form).getByLabelText('Réponse'), 'La porte d’entrée');
    await user.click(within(form).getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('La porte d’entrée')).toBeInTheDocument();

    // Jouer : 2 cartes = 2 manches.
    await user.click(screen.getByRole('link', { name: 'Jouer' }));
    expect(await screen.findByText('Manche 1 sur 2')).toBeInTheDocument();
    expect(screen.getByText('Mon jeu')).toBeInTheDocument();
    await playAll(user, 'Trouvé', 2);
    expect(
      screen.getByRole('heading', { name: '2 étoiles gagnées ensemble !' }),
    ).toBeInTheDocument();

    // Le jeu apparaît sur l'accueil.
    await user.click(screen.getByRole('link', { name: 'Accueil' }));
    expect(
      await screen.findByRole('link', { name: /Les bruits de la maison/ }),
    ).toBeInTheDocument();
  });

  it('supprime un jeu créé', async () => {
    const user = userEvent.setup();
    const id = await createCustomGame('À jeter', 'draw');
    await addItem(id, { answer: 'un chat' });
    open(`/creer/${id}`);
    expect(await screen.findByText('un chat')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Supprimer un chat' }));
    expect(await screen.findByText('0 carte')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Supprimer le jeu' }));
    await waitFor(() => expect(window.location.hash).toBe('#/ajouter'));
    expect(await db.customGames.count()).toBe(0);
  });

  it('un jeu de dessin créé se joue avec ses mots', async () => {
    const id = await createCustomGame('Dessins de Noël', 'draw');
    await addItem(id, { answer: 'un sapin' });
    open(`/jeu/perso-${id}`);
    expect(await screen.findByText('un sapin')).toBeInTheDocument();
    expect(screen.getByText('Manche 1 sur 1')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('1:00');
  });

  it('un jeu supprimé ou vide ne plante pas', async () => {
    const id = await createCustomGame('Vide', 'image');
    const view = open(`/jeu/perso-${id}`);
    expect(await screen.findByText('Ce jeu n’a pas encore de carte')).toBeInTheDocument();
    view.unmount();
    open('/jeu/perso-999');
    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
  });
});

describe('Étoiles et historique', () => {
  it('affiche le total, les récompenses, l’historique et la dernière partie', async () => {
    const user = userEvent.setup();
    await addPlayer('Léa');
    open('/jeu/lettres');
    for (let i = 0; i < 10; i++)
      await user.click(screen.getByRole('button', { name: i < 3 ? 'Trouvé' : 'Passer' }));
    await user.click(screen.getByRole('link', { name: 'Accueil' }));
    expect(await screen.findByText('Quelle lettre ?', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(/Dernière partie aujourd’hui/)).toHaveTextContent('3 étoiles');

    await user.click(screen.getByRole('link', { name: 'Étoiles' }));
    expect(await screen.findByText('3 étoiles')).toBeInTheDocument();
    expect(screen.getByText('gagnées ensemble en 1 partie')).toBeInTheDocument();
    expect(screen.getByLabelText('Première étoile : gagnée')).toBeInTheDocument();
    expect(screen.getByLabelText('10 étoiles : à gagner')).toBeInTheDocument();
    expect(screen.getByText('Encore 7 étoiles pour « 10 étoiles ».')).toBeInTheDocument();
    expect(screen.getByText('aujourd’hui · Léa')).toBeInTheDocument();
  });

  it('nomme « Jeu supprimé » une partie d’un jeu créé puis supprimé', async () => {
    const now = Date.now();
    await db.games.add({
      gameId: 'perso-42',
      startedAt: now,
      updatedAt: now,
      played: 4,
      rounds: 10,
      stars: 2,
      playerIds: [],
    } as never);
    open('/etoiles');
    expect(await screen.findByText('Jeu supprimé')).toBeInTheDocument();
    expect(screen.getByText('aujourd’hui · 4 manches sur 10')).toBeInTheDocument();
  });
});

describe('Espace parent', () => {
  it('règle le nombre de manches et le minuteur', async () => {
    const user = userEvent.setup();
    const view = open('/parent');
    await user.click(screen.getByLabelText('5'));
    await user.click(screen.getByLabelText('1:30'));
    expect(getSettings()).toMatchObject({ rounds: 5, drawSeconds: 90 });
    view.unmount();

    const game = open('/jeu/lettres');
    expect(screen.getByText('Manche 1 sur 5')).toBeInTheDocument();
    game.unmount();
    open('/jeu/dessin');
    expect(screen.getByRole('timer')).toHaveTextContent('1:30');
  });

  it('remet les étoiles à zéro puis efface toutes les données', async () => {
    const user = userEvent.setup();
    await addPlayer('Léa');
    await createCustomGame('Mon jeu', 'question');
    await setSetting('rounds', 15);
    await db.games.add({
      gameId: 'lettres',
      startedAt: 1,
      updatedAt: 1,
      played: 1,
      rounds: 10,
      stars: 1,
      playerIds: [],
    } as never);
    open('/parent');

    await user.click(screen.getByRole('button', { name: 'Remettre les étoiles à zéro' }));
    expect(await screen.findByText('Les étoiles sont remises à zéro.')).toBeInTheDocument();
    expect(await db.games.count()).toBe(0);
    expect(await db.players.count()).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Effacer toutes les données' }));
    expect(await screen.findByText('Toutes les données ont été effacées.')).toBeInTheDocument();
    expect(await db.players.count()).toBe(0);
    expect(await db.customGames.count()).toBe(0);
    expect(getSettings().rounds).toBe(10);
    expect(screen.getByLabelText('10')).toBeChecked();
  });

  it('ne fait rien si le parent annule', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await addPlayer('Léa');
    open('/parent');
    await user.click(screen.getByRole('button', { name: 'Effacer toutes les données' }));
    expect(await db.players.count()).toBe(1);
  });
});
