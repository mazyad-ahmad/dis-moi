import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';
import { loadSettings, setSetting } from '../data/settings';
import { findCatalogueGame } from './catalogue/catalogue';
import { suitsMode } from './modes';

// #59 : deux jeux de langage oraux, Ça rime avec… et Les contraires.

const accepted = (answer: string) => answer.split(', ');
const GAMES = [
  { id: 'rime', name: 'Ça rime avec…', question: /^Trouve un mot qui rime avec « .+ »\.$/ },
  { id: 'contraire', name: 'Les contraires', question: /^Le contraire de « .+ » \?$/ },
];

describe.each(GAMES)('$name : le pack', ({ id, question }) => {
  const game = findCatalogueGame(id)!;

  it('40 cartes, sur les trois niveaux', () => {
    expect(game.items).toHaveLength(40);
    for (const level of [1, 2, 3])
      expect(game.items.filter((i) => i.level === level).length).toBeGreaterThanOrEqual(12);
  });

  it('chaque carte : une question à lire et plusieurs réponses acceptées', () => {
    for (const item of game.items) {
      expect(item.text).toMatch(question);
      expect(accepted(item.answer).length).toBeGreaterThanOrEqual(2);
      expect(item.hint).toBeTruthy();
    }
  });

  it('une réponse acceptée n’appartient qu’à une carte (pas de choix ambigu en montrant)', () => {
    const words = game.items.flatMap((i) => accepted(i.answer).map((w) => w.toLowerCase()));
    expect(new Set(words).size).toBe(words.length);
  });

  it('est un jeu oral, jouable en Voiture et au Coucher', () => {
    expect(game.kind).toBe('question');
    expect(suitsMode(game.needs, 'voiture')).toBe(true);
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
  });
});

describe.each(GAMES)('$name, en jeu', ({ id, question }) => {
  const game = findCatalogueGame(id)!;

  beforeEach(async () => {
    sessionStorage.clear();
    await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
    await loadSettings();
    await setSetting('catalogue', [id]);
  });

  it('en Voiture : le parent lit, voit un exemple, puis les réponses acceptées', async () => {
    const user = userEvent.setup();
    await setSetting('showChoices', true);
    await setSetting('gameMode', 'voiture');
    window.location.hash = `#/jeu/${id}`;
    render(<App />);
    const card = await screen.findByRole('region', { name: 'Question' });
    const item = game.items.find((i) => i.text === within(card).getByText(question).textContent)!;
    // Rien à regarder pour l'enfant.
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    expect(within(parent).getByText(`Indice : ${item.hint}`)).toBeInTheDocument();
    expect(within(parent).queryByText(new RegExp(accepted(item.answer)[1]))).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
    expect(within(parent).getByText(new RegExp(item.answer))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
  });
});
