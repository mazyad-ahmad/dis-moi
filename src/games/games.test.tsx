import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';
import { addPlayer } from '../data/players';
import { loadSettings } from '../data/settings';
import { ALL_GLYPHS, DIGITS, LETTERS } from './lettres/bank';

beforeEach(async () => {
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

it('Quelle lettre : 10 manches, étoiles, résultat et enregistrement', async () => {
  const user = userEvent.setup();
  await addPlayer('Léa');
  open('/jeu/lettres');
  expect(screen.getByRole('heading', { name: 'Quelle lettre ?' })).toBeInTheDocument();

  const seen = new Set<string>();
  for (let i = 1; i <= 10; i++) {
    expect(screen.getByText(`Manche ${i} sur 10`)).toBeInTheDocument();
    seen.add(screen.getByTestId('glyph').textContent!);
    await user.click(screen.getByRole('button', { name: i <= 7 ? 'Trouvé' : 'Passer' }));
  }
  expect(seen.size).toBe(10); // pas de répétition
  expect(screen.getByRole('heading', { name: '7 étoiles gagnées ensemble !' })).toBeInTheDocument();

  await waitFor(async () => {
    const [game] = await db.games.toArray();
    expect(game).toMatchObject({ gameId: 'lettres', played: 10, rounds: 10, stars: 7 });
    expect(game.playerIds).toHaveLength(1);
  });

  await user.click(screen.getByRole('button', { name: 'Rejouer' }));
  expect(screen.getByText('Manche 1 sur 10')).toBeInTheDocument();
});

it('Quelle lettre : au niveau Petits, les lettres des petits d’abord, puis le niveau voisin', async () => {
  const user = userEvent.setup();
  await db.settings.put({ key: 'gameLevel', value: 1 });
  await loadSettings();
  open('/jeu/lettres');
  const levelOf = (glyph: string) => LETTERS.find((c) => c.glyph === glyph)!.level;
  const levels: number[] = [];
  for (let i = 1; i <= 10; i++) {
    levels.push(levelOf(screen.getByTestId('glyph').textContent!));
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  }
  // 5 lettres pour les petits, puis des lettres des moyens : jamais de manque.
  expect(levels).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 2, 2]);
  await db.settings.clear();
  await loadSettings();
});

it('Quelle lettre : bascule vers les chiffres', async () => {
  const user = userEvent.setup();
  open('/jeu/lettres');
  await user.click(screen.getByLabelText('Chiffres'));
  expect(screen.getByRole('heading', { name: 'Quel chiffre ?' })).toBeInTheDocument();
  const glyph = screen.getByTestId('glyph').textContent!;
  expect(glyph).toMatch(/^\d$/);
  expect(screen.getByText(DIGITS[Number(glyph)].hint)).toBeInTheDocument();
});

it('Quelle lettre : minuscules, attaché, nombres, dés et doigts, mélange (#48)', async () => {
  const user = userEvent.setup();
  open('/jeu/lettres');
  const glyph = () => screen.getByTestId('glyph');
  const hintOf = (set: string) =>
    ALL_GLYPHS.find((c) => c.set === set && c.glyph === glyph().dataset.glyph)!.hint;

  await user.click(screen.getByLabelText('Minuscules'));
  expect(glyph().textContent).toMatch(/^[a-z]$/);
  expect(screen.getByText(hintOf('lower'))).toBeInTheDocument();

  await user.click(screen.getByLabelText('Attaché'));
  expect(glyph()).toHaveClass('glyph-card__glyph--cursive');
  expect(screen.getByText(hintOf('cursive'))).toBeInTheDocument();

  await user.click(screen.getByLabelText('Nombres'));
  expect(screen.getByRole('heading', { name: 'Quel nombre ?' })).toBeInTheDocument();
  expect(Number(glyph().textContent)).toBeGreaterThanOrEqual(10);
  expect(screen.getByText(hintOf('number'))).toBeInTheDocument();

  await user.click(screen.getByLabelText('Dés, doigts'));
  expect(screen.getByRole('heading', { name: 'Combien ?' })).toBeInTheDocument();
  // Un dessin, annoncé « 3 points » ou « 3 doigts » ; la consigne reste pour le parent.
  expect(glyph()).toHaveAccessibleName(/^\d+ (points?|doigts?)$/);
  expect(glyph().querySelector('svg')).toBeInTheDocument();
  const set = /point/.test(glyph().getAttribute('aria-label')!) ? 'dice' : 'fingers';
  expect(screen.getByText(hintOf(set))).toBeInTheDocument();

  // Mélange : toutes les familles, chacune avec sa consigne.
  await user.click(screen.getByLabelText('Mélange'));
  for (let i = 0; i < 5; i++) {
    const card = ALL_GLYPHS.find(
      (c) =>
        c.glyph === glyph().dataset.glyph && screen.queryByText(c.hint, { exact: true }) !== null,
    );
    expect(card).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  }
});

it('garde les étoiles quand on quitte en cours de partie', async () => {
  const user = userEvent.setup();
  open('/jeu/lettres');
  await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  expect(screen.getByLabelText('2 étoiles')).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Quitter la partie' }));
  expect(await screen.findByRole('heading', { name: 'On joue à quoi ?' })).toBeInTheDocument();
  await waitFor(async () =>
    expect(await db.games.toArray()).toMatchObject([{ played: 2, stars: 2 }]),
  );
});

it('Quelle chanson : indice visible, titre caché, son indisponible signalé', async () => {
  const user = userEvent.setup();
  open('/jeu/chanson');
  expect(screen.getByText(/^Indice :/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
  expect(screen.queryByRole('button', { name: 'Voir la réponse' })).not.toBeInTheDocument();

  // jsdom n'a pas de Web Audio.
  await user.click(screen.getByRole('button', { name: 'Écouter l’extrait' }));
  expect(screen.getByRole('status')).toHaveTextContent('Le son n’est pas disponible');

  await user.click(screen.getByRole('button', { name: 'Pas encore' }));
  expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
  // Nouvelle manche : la réponse est de nouveau cachée.
  expect(screen.getByRole('button', { name: 'Voir la réponse' })).toBeInTheDocument();
});

describe('Dessine ça', () => {
  afterEach(() => vi.useRealTimers());

  it('change de mot, compte les étoiles et arrête le dessin à la fin du minuteur', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    open('/jeu/dessin');

    expect(screen.getByRole('timer')).toHaveTextContent('1:00');
    act(() => void vi.advanceTimersByTime(18_000));
    expect(screen.getByRole('timer')).toHaveTextContent('0:42');

    const word = () => screen.getByLabelText('Mot à dessiner').querySelector('strong')!.textContent;
    const first = word();
    await user.click(screen.getByRole('button', { name: 'Autre mot' }));
    expect(word()).not.toBe(first);
    expect(screen.getByRole('timer')).toHaveTextContent('1:00'); // minuteur relancé
    expect(screen.getByText('Manche 1 sur 10')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Couleur : Noir' }));
    await user.click(screen.getByRole('radio', { name: 'Bleu' }));
    expect(screen.getByRole('button', { name: 'Couleur : Bleu' })).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(61_000));
    expect(screen.getByRole('timer')).toHaveAccessibleName('Temps écoulé');
    expect(screen.getByText(/Temps écoulé ! Le parent valide/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: "C'est fini" }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('1:00');
  });
});

it('un jeu inconnu affiche la page introuvable', () => {
  open('/jeu/inconnu');
  expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
});
