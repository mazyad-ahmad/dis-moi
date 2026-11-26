import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { findCatalogueGame } from '../catalogue/catalogue';
import { seeded } from '../compte/compte';
import { DAILY_SOURCES } from '../defi/daily';
import { suitsMode } from '../modes';
import { revealsInCatalogue } from '../reveal/reveal';
import { coinsSvg } from './coins';
import {
  COINS,
  coinsName,
  coinsText,
  fewestCoins,
  makeMarche,
  MARCHE_ID,
  marcheChoices,
  MAX_PRICE,
  parsePrice,
  priceOf,
  priceText,
  priceWords,
  sum,
} from './marche';
import { MarcheRound } from './MarcheGame';

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const game = findCatalogueGame(MARCHE_ID)!;
const atLevel = (level: number) => game.items.filter((i) => i.level === level);

describe('articles du marché', () => {
  it('des prix réalistes et petits, sous 10 €', () => {
    expect(atLevel(2).length).toBeGreaterThanOrEqual(10);
    expect(atLevel(3).length).toBeGreaterThanOrEqual(10);
    expect(atLevel(1)).toHaveLength(0);
    expect(new Set(game.items.map((i) => i.emoji)).size).toBe(game.items.length);
    for (const item of game.items) {
      const price = parsePrice(item.text);
      expect(price).toBeDefined();
      expect(price).toBeGreaterThan(0);
      expect(price).toBeLessThanOrEqual(MAX_PRICE);
      expect(priceText(price!)).toBe(item.text);
      expect(item.answer).toMatch(/^(un|une) /);
      // Des multiples de 10 centimes : la plus petite pièce du jeu.
      expect(price! % 10).toBe(0);
    }
    // Moyens : des euros ronds, 5 € au plus ; Grands : des centimes.
    for (const item of atLevel(2)) {
      expect(priceOf(item) % 100).toBe(0);
      expect(priceOf(item)).toBeLessThanOrEqual(500);
    }
    for (const item of atLevel(3)) expect(priceOf(item) % 100).not.toBe(0);
  });

  it('écrit et dit les prix', () => {
    expect(priceText(120)).toBe('1,20 €');
    expect(priceText(50)).toBe('0,50 €');
    expect(priceText(300)).toBe('3 €');
    expect(priceWords(100)).toBe('1 euro');
    expect(priceWords(300)).toBe('3 euros');
    expect(priceWords(120)).toBe('1 euro 20');
    expect(priceWords(50)).toBe('50 centimes');
    expect(coinsText([100, 20])).toBe('1 € + 20 c');
    expect(coinsName([200, 100, 50])).toBe('2 euros, 1 euro et 50 centimes');
    expect(parsePrice('12 €')).toBeUndefined();
  });

  it('une façon de payer avec le moins de pièces, celles du niveau', () => {
    for (const item of game.items) {
      const card = makeMarche(item);
      expect(sum(card.answer)).toBe(card.price);
      for (const coin of card.answer) expect(card.coins).toContain(coin);
      expect(card.coins).toEqual(item.level === 2 ? [200, 100] : [200, 100, 50, 20, 10]);
      expect(card.question).toMatch(/^[A-Z].* coûte .+\. Quelles pièces donnes-tu \?$/u);
    }
    expect(fewestCoins(390, COINS[3])).toEqual([200, 100, 50, 20, 20]);
    expect(fewestCoins(300, COINS[2])).toEqual([200, 100]);
    expect(makeMarche(game.items.find((i) => i.id === 'croissant')!).explain).toBe(
      'Par exemple 1 € + 20 c : 2 pièces pour 1,20 €. Une autre façon de faire 1,20 € compte aussi.',
    );
  });

  it('choix à montrer : une seule poignée fait le bon compte', () => {
    for (const item of game.items)
      for (const count of [2, 3, 4]) {
        const card = makeMarche(item);
        const options = marcheChoices(card, count, seeded(`${item.id}-${count}`));
        expect(options).toHaveLength(count);
        const sums = options.map(sum);
        expect(new Set(sums).size).toBe(count);
        expect(sums.filter((s) => s === card.price)).toHaveLength(1);
        expect(options.map(coinsText)).toContain(coinsText(card.answer));
        for (const coins of options) {
          expect(coins.length).toBeGreaterThan(0);
          for (const coin of coins) expect(card.coins).toContain(coin);
        }
      }
  });

  it('des pièces dessinées par l’appli, pas de photo', () => {
    const svg = coinsSvg([200, 100, 50, 20, 10]);
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).not.toMatch(/<image|href=/);
    for (const label of ['2 €', '1 €', '50 c', '20 c', '10 c']) expect(svg).toContain(label);
  });

  it('se regarde : au coucher, pas en voiture ; dans le défi, pas en image cachée', () => {
    expect(game.needs).toEqual({ looks: true, moves: false });
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
    expect(suitsMode(game.needs, 'voiture')).toBe(false);
    expect(game.activities).toEqual(['lire-compter']);
    expect(game.levels).toEqual([2, 3]);
    expect(DAILY_SOURCES.some((s) => s.game === MARCHE_ID)).toBe(true);
    expect(revealsInCatalogue(game)).toBe(false);
  });
});

describe('Le petit marché', () => {
  it('le parent lit le prix, voit une façon de payer et valide', async () => {
    await setSetting('gameLevel', 2);
    const user = userEvent.setup();
    open(`/jeu/${MARCHE_ID}`);
    expect(screen.getByRole('heading', { name: 'Le petit marché' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Question' })).toHaveTextContent(
      /coûte \d euros?\. Quelles pièces donnes-tu \?/,
    );
    expect(screen.getByRole('region', { name: 'Article' })).toHaveTextContent(/\d €/);
    expect(
      within(screen.getByRole('region', { name: 'Porte-monnaie' })).getByRole('img', {
        name: 'Pièces de 2 euros et 1 euro',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();

    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    await user.click(within(parent).getByRole('button', { name: 'Voir la réponse' }));
    expect(parent).toHaveTextContent(/Par exemple .* compte aussi/);
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
  });

  it('en montrant, l’enfant touche les bonnes pièces parmi les choix', async () => {
    await setSetting('gameLevel', 3);
    await setSetting('showChoices', true);
    const user = userEvent.setup();
    open(`/jeu/${MARCHE_ID}`);
    const board = screen.getByRole('region', { name: 'Choix de l’enfant' });
    const options = within(board).getAllByRole('button');
    expect(options).toHaveLength(4);
    const status = within(board).getByRole('status');
    let right = 0;
    for (const option of options) {
      await user.click(option);
      if (status.textContent?.includes('Oui, c’est ça')) right++;
      if (right) break;
      expect(status).toHaveTextContent('');
    }
    expect(right).toBe(1);
  });

  it('dans le Défi du jour, l’article sans choix', async () => {
    await setSetting('showChoices', true);
    render(<MarcheRound item={game.items[0]} choices={false} />);
    expect(screen.getByRole('img', { name: 'une baguette' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();
  });

  it('se joue dans le Grand Jeu avec son étal', async () => {
    await setSetting('catalogue', ['mime', MARCHE_ID]);
    await setSetting('grandExcluded', ['chanson', 'lettres', 'dessin', 'raconte']);
    const user = userEvent.setup();
    open('/jeu/grand-jeu');
    let seen = false;
    for (const round of [1, 2]) {
      await user.click(await screen.findByRole('button', { name: /C’est parti/ }));
      const stall = screen.queryByRole('region', { name: 'Porte-monnaie' });
      if (stall) seen = true;
      await user.click(screen.getByRole('button', { name: stall ? 'Pas encore' : 'Passer' }));
      if (round === 1) await screen.findByText('Manche 2 sur 10');
    }
    expect(seen).toBe(true);
  });
});
