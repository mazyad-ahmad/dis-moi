import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { findCatalogueGame } from '../catalogue/catalogue';
import { DAILY_SOURCES } from '../defi/daily';
import { suitsMode } from '../modes';
import { familiesSpoken, TRI_ID, TRI_TAG, TRI_THEMES, triOf, triQuestion } from './tri';
import { TriRound } from './TriRound';

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const game = findCatalogueGame(TRI_ID)!;
const card = (id: string) => game.items.find((i) => i.id === id)!;

describe('cartes d’« Où ça va ? »', () => {
  it('80 cartes sur au moins 6 thèmes et trois niveaux, chacune rangée dans son thème', () => {
    expect(game.items).toHaveLength(80);
    expect(TRI_THEMES.length).toBeGreaterThanOrEqual(6);
    for (const theme of TRI_THEMES) {
      expect(theme.families.length).toBeGreaterThanOrEqual(2);
      expect(theme.families.length).toBeLessThanOrEqual(3);
      const cards = game.items.filter((i) => triOf(i)?.theme === theme);
      expect(cards.length, theme.name).toBeGreaterThanOrEqual(10);
    }
    for (const level of [1, 2, 3])
      expect(game.items.filter((i) => i.level === level).length).toBeGreaterThanOrEqual(10);
    for (const item of game.items) {
      const tri = triOf(item);
      expect(tri, item.answer).toBeDefined();
      // Rien d'autre que le thème et ses familles dans les thèmes de la carte.
      const known = [TRI_TAG + tri!.theme.id, ...tri!.theme.families.map((f) => f.key)];
      for (const tag of item.tags!) expect(known, `${item.answer} : ${tag}`).toContain(tag);
      expect(item.emoji).toBeTruthy();
      expect(tri!.theme.families.map((f) => f.emoji)).not.toContain(item.emoji);
      expect(item.text, item.answer).toBeTruthy();
    }
  });

  it('signale des cas discutables dans plusieurs thèmes', () => {
    const debatable = game.items.filter((i) => triOf(i)!.debatable);
    expect(debatable.length).toBeGreaterThanOrEqual(6);
    expect(new Set(debatable.map((i) => triOf(i)!.theme.id)).size).toBeGreaterThanOrEqual(4);
    expect(triOf(card('canard'))!.accepted.map((f) => f.key)).toEqual(['ferme', 'foret']);
  });

  it('se joue à l’oral : au coucher, en voiture, dans le défi du jour', () => {
    expect(game.needs).toEqual({ looks: false, moves: false });
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
    expect(suitsMode(game.needs, 'voiture')).toBe(true);
    expect(DAILY_SOURCES.some((s) => s.game === TRI_ID)).toBe(true);
  });

  it('pose la question avec les familles à voix haute', () => {
    const animaux = TRI_THEMES.find((t) => t.id === 'animaux')!;
    expect(familiesSpoken(animaux)).toBe('à la ferme, dans la forêt ou dans la mer');
    expect(triQuestion(card('vache'), animaux)).toBe(
      'La vache, ça vit à la ferme, dans la forêt ou dans la mer ?',
    );
    expect(triQuestion(card('tomate'), triOf(card('tomate'))!.theme)).toBe(
      'La tomate, c’est un fruit ou un légume ?',
    );
    expect(triOf({ tags: ['ferme'] })).toBeUndefined();
    expect(triOf({ tags: ['tri-animaux'] })).toBeUndefined();
    expect(triOf({})).toBeUndefined();
  });
});

describe('une manche', () => {
  it('montre l’élément et les familles ; le parent voit la réponse et son explication', async () => {
    const user = userEvent.setup();
    render(<TriRound item={card('vache')} />);
    const question = screen.getByRole('region', { name: 'Question' });
    expect(question).toHaveTextContent('🐄');
    expect(question).toHaveTextContent('La vache, ça vit à la ferme');
    const families = within(screen.getByRole('list', { name: 'Familles' })).getAllByRole(
      'listitem',
    );
    expect(families.map((f) => f.textContent)).toEqual([
      '🚜À la ferme',
      '🌲Dans la forêt',
      '🌊Dans la mer',
    ]);
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    expect(parent).not.toHaveTextContent('discutable');
    await user.click(within(parent).getByRole('button', { name: 'Voir la réponse' }));
    expect(parent).toHaveTextContent('🚜 À la ferme');
    expect(parent).toHaveTextContent('on la trait pour avoir du lait');
  });

  it('carte discutable : signalée au parent, chaque famille acceptée en montrant', async () => {
    await setSetting('showChoices', true);
    const user = userEvent.setup();
    render(<TriRound item={card('canard')} />);
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    expect(parent).toHaveTextContent('Carte discutable');

    const board = screen.getByRole('region', { name: 'Choix de l’enfant' });
    expect(within(board).getAllByRole('button')).toHaveLength(3);
    // Un choix qui ne va pas ne fait rien.
    await user.click(within(board).getByRole('button', { name: 'Dans la mer' }));
    expect(within(board).getByRole('status')).toHaveTextContent('');
    await user.click(within(board).getByRole('button', { name: 'Dans la forêt' }));
    expect(within(board).getByRole('status')).toHaveTextContent('Oui, c’est ça : Dans la forêt !');
    await user.click(within(board).getByRole('button', { name: 'À la ferme' }));
    expect(within(board).getByRole('status')).toHaveTextContent('Oui, c’est ça : À la ferme !');

    await user.click(within(parent).getByRole('button', { name: 'Voir la réponse' }));
    expect(parent).toHaveTextContent('🚜 À la ferme ou 🌲 Dans la forêt : les deux se disent');
  });

  it('en voiture, pas de choix à toucher', async () => {
    await setSetting('showChoices', true);
    await setSetting('gameMode', 'voiture');
    render(<TriRound item={card('tomate')} />);
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Question' })).toHaveTextContent(
      'un fruit ou un légume ?',
    );
  });
});

describe('Où ça va ?', () => {
  it('se joue depuis le catalogue, une étoile par carte trouvée', async () => {
    const user = userEvent.setup();
    open(`/jeu/${TRI_ID}`);
    expect(screen.getByRole('heading', { name: 'Où ça va ?' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Question' })).toHaveTextContent(
      /, (ça vit|c’est|ça va) .+ ou .+ \?$/,
    );
    expect(screen.getByRole('list', { name: 'Familles' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pas encore' }));
    expect(screen.getByText('Manche 3 sur 10')).toBeInTheDocument();
  });
});
