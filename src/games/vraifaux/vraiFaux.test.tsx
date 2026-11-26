import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { findCatalogueGame } from '../catalogue/catalogue';
import { hintLadder } from '../hints';
import { suitsMode } from '../modes';
import { verdictOf } from './verdict';

const game = findCatalogueGame('vrai-faux')!;

describe('Vrai ou faux rigolo : le pack', () => {
  it('60 cartes, 20 par niveau, moitié vraies, moitié fausses', () => {
    expect(game.items).toHaveLength(60);
    for (const level of [1, 2, 3]) {
      const cards = game.items.filter((i) => i.level === level);
      expect(cards).toHaveLength(20);
      expect(cards.filter((i) => verdictOf(i.answer) === 'vrai')).toHaveLength(10);
      expect(cards.filter((i) => verdictOf(i.answer) === 'faux')).toHaveLength(10);
    }
  });

  it('chaque carte : une affirmation à lire, puis la réponse et une courte explication', () => {
    for (const item of game.items) {
      expect(item.text).toMatch(/\.$/);
      expect(item.answer).toMatch(/^(Vrai|Faux) ! \S.{8,}/);
    }
  });

  it('est un jeu oral, jouable en Voiture et au Coucher', () => {
    expect(game.kind).toBe('question');
    expect(suitsMode(game.needs, 'voiture')).toBe(true);
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
  });
});

describe('verdict d’une réponse', () => {
  it('reconnaît « Vrai » et « Faux » en tête de réponse, seulement comme mot', () => {
    expect(verdictOf('Vrai ! Elle a trois cœurs.')).toBe('vrai');
    expect(verdictOf('faux')).toBe('faux');
    expect(verdictOf(' Faux : non.')).toBe('faux');
    expect(verdictOf('Faux-filet')).toBeUndefined();
    expect(verdictOf('Vraiment')).toBeUndefined();
    expect(verdictOf('La vache')).toBeUndefined();
  });

  it('pas d’indice « Ça commence par… », qui donnerait la réponse', () => {
    expect(hintLadder({ answer: 'Faux ! Ils n’ont pas de pieds.' })).toEqual([]);
    expect(hintLadder({ answer: 'Vrai !', hint: 'Pense à la ferme.' })).toEqual([
      'Pense à la ferme.',
    ]);
    expect(hintLadder({ answer: 'La vache' })).toEqual(['Ça commence par « V »']);
  });
});

describe('Vrai ou faux rigolo, en jeu', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
    await loadSettings();
    await setSetting('catalogue', ['vrai-faux']);
  });

  function open(path: string) {
    window.location.hash = `#${path}`;
    return render(<App />);
  }

  it('le parent lit l’affirmation ; la réponse et son explication restent cachées', async () => {
    const user = userEvent.setup();
    open('/jeu/vrai-faux');
    const card = await screen.findByRole('region', { name: 'Question' });
    const statement = within(card).getByText(/\.$/).textContent!;
    const item = game.items.find((i) => i.text === statement)!;
    expect(screen.queryByText(item.answer)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /indice/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
    expect(screen.getByText(item.answer)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
  });

  it('en montrant : deux choix, Vrai puis Faux, quel que soit le niveau', async () => {
    const user = userEvent.setup();
    await setSetting('showChoices', true);
    await setSetting('gameLevel', 3);
    open('/jeu/vrai-faux');
    const board = await screen.findByRole('region', { name: 'Choix de l’enfant' });
    const buttons = within(board).getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Vrai', 'Faux']);

    const statement = within(screen.getByRole('region', { name: 'Question' })).getByText(
      /\.$/,
    ).textContent!;
    const verdict = verdictOf(game.items.find((i) => i.text === statement)!.answer)!;
    const right = within(board).getByRole('button', { name: verdict === 'vrai' ? 'Vrai' : 'Faux' });
    const wrong = buttons.find((b) => b !== right)!;
    await user.click(wrong);
    expect(within(board).getByRole('status')).toHaveTextContent('');
    await user.click(right);
    expect(right).toHaveClass('is-right');
    await waitFor(() =>
      expect(within(board).getByRole('status')).toHaveTextContent(
        /^Oui, c’est ça : (Vrai|Faux) !$/,
      ),
    );
  });

  it('en Voiture : tout à l’oral, sans choix à regarder', async () => {
    await setSetting('showChoices', true);
    await setSetting('gameMode', 'voiture');
    open('/jeu/vrai-faux');
    expect(await screen.findByRole('region', { name: 'Question' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();
  });
});
