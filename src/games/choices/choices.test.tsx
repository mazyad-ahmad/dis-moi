import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { resetAudioForTests } from '../../audio/context';
import { db } from '../../data/db';
import { addPlayer, setPlayerLevel } from '../../data/players';
import { loadSettings, setSetting } from '../../data/settings';
import { FakeContext, played, resetFakeAudio } from '../../test/fakeAudio';
import { findCatalogueGame } from '../catalogue/catalogue';
import { SONGS } from '../chanson/songs';
import { DIGITS, LETTERS } from '../lettres/bank';
import {
  arrange,
  choiceCount,
  choiceLevel,
  deckChoicePool,
  deckOption,
  drawDistractors,
  glyphOption,
  songOption,
  type ChoiceOption,
} from './choices';

const opt = (key: string, level?: 1 | 2 | 3): ChoiceOption => ({ key, label: key, level });

describe('tirage des choix', () => {
  it('nombre de choix selon le niveau : Petits 2, Moyens 3, Grands 4, 3 sans niveau', () => {
    expect([choiceCount(1), choiceCount(2), choiceCount(3), choiceCount(null)]).toEqual([
      2, 3, 4, 3,
    ]);
  });

  it('niveau de la partie, sinon le plus jeune des joueurs du jour qui ont un niveau', () => {
    expect(choiceLevel(3, [{ level: 1 }])).toBe(3);
    expect(choiceLevel(null, [{ level: 3 }, {}, { level: 2 }])).toBe(2);
    expect(choiceLevel(null, [{}])).toBeNull();
    expect(choiceLevel(null, [])).toBeNull();
  });

  it('choix voisins du même jeu, sans doublon ni la réponse, le même niveau d’abord', () => {
    const answer = opt('a', 1);
    const pool = [opt('a', 1), opt('b', 3), opt('c', 1), opt('c', 1), opt('d', 1), opt('e', 1)];
    const others = drawDistractors(answer, pool);
    expect(others).toHaveLength(3);
    expect(others.map((o) => o.key).sort()).toEqual(['c', 'd', 'e']);
  });

  it('la réponse à sa place, moins de choix si le jeu est petit', () => {
    const answer = opt('a');
    const others = [opt('b'), opt('c'), opt('d')];
    expect(arrange(answer, others, 2, 0).map((o) => o.key)).toEqual(['a', 'b']);
    expect(arrange(answer, others, 4, 0.99).map((o) => o.key)).toEqual(['b', 'c', 'd', 'a']);
    expect(arrange(answer, others.slice(0, 1), 4, 0.5)).toHaveLength(2);
    expect(arrange(answer, [], 4, 0)).toEqual([]);
  });

  it('un visuel par jeu, le texte de la réponse sans image', () => {
    const animal = findCatalogueGame('animal')!.items[0];
    expect(deckOption(animal)).toMatchObject({ label: 'La vache', emoji: '🐄' });
    const color = findCatalogueGame('couleur')!.items[0];
    expect(deckOption(color)).toMatchObject({ label: 'Rouge', color: '#d7263d' });
    expect(deckOption(color).emoji).toBeUndefined();
    const riddle = findCatalogueGame('devinette')!.items[0];
    const r = deckOption(riddle);
    expect([r.emoji, r.color, r.image, r.glyph]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect(r.label).toBe(riddle.answer);
    expect(glyphOption(LETTERS[0])).toMatchObject({ label: 'Lettre A', glyph: 'A' });
    expect(glyphOption(DIGITS[3]).label).toMatch(/^Chiffre \d$/);
    // Chaque chanson a son image.
    SONGS.forEach((s) => expect(songOption(s).emoji).toBeTruthy());
  });

  it('pas de choix pour le dessin ni le mime', () => {
    expect(deckChoicePool(findCatalogueGame('mime')!)).toBeUndefined();
    expect(deckChoicePool({ id: 'x', kind: 'draw', items: [] })).toBeUndefined();
    expect(deckChoicePool(findCatalogueGame('animal')!)).toHaveLength(
      findCatalogueGame('animal')!.items.length,
    );
  });
});

describe('Répondre en montrant, en jeu', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    resetFakeAudio();
    resetAudioForTests();
    vi.stubGlobal('AudioContext', FakeContext);
    await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
    await loadSettings();
  });
  afterEach(() => vi.unstubAllGlobals());

  function open(path: string) {
    window.location.hash = `#${path}`;
    return render(<App />);
  }

  const board = () => screen.getByRole('region', { name: 'Choix de l’enfant' });

  it('se choisit sur l’accueil, à voix haute par défaut', async () => {
    const user = userEvent.setup();
    open('/');
    await user.click(await screen.findByRole('button', { name: /La partie/ }));
    const voice = await screen.findByRole('radio', { name: 'À voix haute' });
    expect(voice).toBeChecked();
    await user.click(screen.getByText('En montrant'));
    expect(screen.getByRole('radio', { name: 'En montrant' })).toBeChecked();
    expect(screen.getByText(/parmi 3 choix/)).toBeInTheDocument();
    await user.click(screen.getByText('Grands', { exact: true }));
    expect(screen.getByText(/parmi 4 choix/)).toBeInTheDocument();
  });

  it('sans le réglage, aucune carte ne montre de choix', () => {
    open('/jeu/lettres');
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();
    expect(screen.getByTestId('glyph')).toBeInTheDocument();
  });

  it('lettres : Petits, 2 choix ; un mauvais choix ne fait rien, le bon est mis en valeur', async () => {
    const user = userEvent.setup();
    await setSetting('showChoices', true);
    await setSetting('gameLevel', 1);
    open('/jeu/lettres');
    const buttons = within(board()).getAllByRole('button');
    expect(buttons).toHaveLength(2);
    buttons.forEach((b) => expect(b).toHaveAccessibleName(/^Lettre [A-Z]$/));
    // Le glyphe en grand est remplacé : le parent demande, l'enfant montre.
    expect(screen.queryByTestId('glyph')).not.toBeInTheDocument();
    const asked = screen.getByText(/Demande à l’enfant de montrer/).querySelector('strong')!;
    const glyph = asked.textContent!.slice(-1);
    const right = within(board()).getByRole('button', { name: `Lettre ${glyph}` });
    const wrong = buttons.find((b) => b !== right)!;

    await user.click(wrong);
    expect(wrong).not.toHaveClass('is-right');
    expect(within(board()).getByRole('status')).toHaveTextContent('');
    expect(played()).toEqual([]);

    await user.click(right);
    expect(right).toHaveClass('is-right');
    expect(within(board()).getByRole('status')).toHaveTextContent(
      `Oui, c’est ça : Lettre ${glyph} !`,
    );

    // Le parent garde la main : Trouvé fait passer à la manche suivante.
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    within(board())
      .getAllByRole('button')
      .forEach((b) => expect(b).not.toHaveClass('is-right'));
  });

  it('couleurs : les pastilles au choix remplacent la couleur montrée', async () => {
    await setSetting('showChoices', true);
    await setSetting('catalogue', ['couleur']);
    open('/jeu/couleur');
    await waitFor(() => expect(within(board()).getAllByRole('button')).toHaveLength(3));
    expect(screen.queryByRole('img', { name: 'Couleur à nommer' })).not.toBeInTheDocument();
    const asked = screen.getByText(/Demande à l’enfant de montrer/).querySelector('strong')!;
    expect(within(board()).getByRole('button', { name: asked.textContent! })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Voir la réponse' })).not.toBeInTheDocument();
  });

  it('lettres : passer aux chiffres retire les choix des lettres', async () => {
    const user = userEvent.setup();
    await setSetting('showChoices', true);
    open('/jeu/lettres');
    await user.click(screen.getByText('Chiffres'));
    within(board())
      .getAllByRole('button')
      .forEach((b) => expect(b).toHaveAccessibleName(/^Chiffre \d$/));
    expect(screen.getByText(/Demande à l’enfant de montrer/)).toHaveTextContent(/le chiffre \d/);
  });

  it('animaux : sans niveau de partie, le niveau du joueur du jour (Grands : 4 images)', async () => {
    await setPlayerLevel(await addPlayer('Léa'), 3);
    await setSetting('showChoices', true);
    await setSetting('catalogue', ['animal']);
    open('/jeu/animal');
    await waitFor(() => expect(within(board()).getAllByRole('button')).toHaveLength(4));
    const names = within(board())
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label'));
    const animals = findCatalogueGame('animal')!.items.map((i) => i.answer);
    names.forEach((n) => expect(animals).toContain(n));
    // Le parent imite toujours le cri ; la réponse reste cachée.
    expect(screen.getByText(/À imiter/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voir la réponse' })).toBeInTheDocument();
  });

  it('chansons : les choix par images s’ajoutent sous le lecteur', async () => {
    await setSetting('showChoices', true);
    open('/jeu/chanson');
    const buttons = within(board()).getAllByRole('button');
    expect(buttons).toHaveLength(3);
    const titles = SONGS.map((s) => s.title);
    buttons.forEach((b) => expect(titles).toContain(b.getAttribute('aria-label')));
    expect(screen.getByRole('region', { name: 'Extrait' })).toBeInTheDocument();
  });

  it('mime : pas de choix, l’enfant mime', async () => {
    await setSetting('showChoices', true);
    await setSetting('catalogue', ['mime']);
    open('/jeu/mime');
    expect(await screen.findByText("Montre l'écran à l'enfant")).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();
  });
});
