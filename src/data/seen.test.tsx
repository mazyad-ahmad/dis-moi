import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { findCatalogueGame } from '../games/catalogue/catalogue';
import { cardKey } from '../games/deck/cardKey';
import { cardLevel, drawForLevel, orderByLevel } from '../games/levels';
import { db } from './db';
import { markSeen, SEEN_KEY, seenAt, seenOf } from './seen';
import { loadSettings, setSetting } from './settings';

beforeEach(async () => {
  await Promise.all([db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

describe('ordre du tirage', () => {
  const levelOf = (n: number) => (n < 4 ? 1 : n < 8 ? 2 : 3);
  const items = Array.from({ length: 12 }, (_, i) => i);

  it('sert d’abord les cartes jamais vues, puis les plus anciennes', () => {
    const stamps = new Map([
      [0, 30],
      [1, 10],
      [2, 20],
    ]);
    const order = orderByLevel(items, null, levelOf, undefined, (n) => stamps.get(n) ?? 0);
    expect(order.slice(0, 9).every((n) => n > 2)).toBe(true);
    expect(order.slice(9)).toEqual([1, 2, 0]);
  });

  it('préfère une carte neuve du niveau voisin, jamais une carte à deux niveaux d’écart', () => {
    // Petits : toutes leurs cartes sont vues ; les moyens neufs passent avant, les grands après.
    const seen = (n: number) => (levelOf(n) === 1 ? n + 1 : 0);
    const order = orderByLevel(items, 1, levelOf, undefined, seen);
    expect(order.slice(0, 4).map(levelOf)).toEqual([2, 2, 2, 2]);
    expect(order.slice(4, 8)).toEqual([0, 1, 2, 3]);
    expect(order.slice(8).map(levelOf)).toEqual([3, 3, 3, 3]);
  });

  it('sans mémoire, garde l’ordre par niveau', () => {
    const order = orderByLevel(items, 2, levelOf);
    expect(order.slice(0, 4).map(levelOf)).toEqual([2, 2, 2, 2]);
  });
});

describe('mémoire des cartes vues', () => {
  it('deux parties de suite n’ont aucune carte commune tant qu’il en reste de nouvelles', () => {
    const deck = findCatalogueGame('mime')!;
    const games: string[][] = [];
    let now = 1;
    for (let g = 0; g < 4; g++) {
      const seen = seenOf(deck.id, deck.items, cardKey);
      const drawn = drawForLevel(deck.items, 10, null, cardLevel, undefined, seen);
      const keys = drawn.map((item) => cardKey(item, deck.items.indexOf(item)));
      keys.forEach((k) => markSeen(deck.id, k, now++));
      games.push(keys);
    }
    // 40 mimes, 10 par partie : quatre parties sans une seule carte en double.
    expect(new Set(games.flat()).size).toBe(40);
    // Toutes vues : la partie suivante reprend les plus anciennes, celles de la première.
    const seen = seenOf(deck.id, deck.items, cardKey);
    const next = drawForLevel(deck.items, 10, null, cardLevel, undefined, seen);
    expect(next.map((i) => i.id).sort()).toEqual([...games[0]].sort());
  });

  it('est gardée sur le téléphone et relue au démarrage', async () => {
    markSeen('couleur', 'rouge', 42);
    await waitFor(async () =>
      expect((await db.settings.get(SEEN_KEY))?.value).toEqual({ couleur: { rouge: 42 } }),
    );
    await loadSettings();
    expect(seenAt('couleur', 'rouge')).toBe(42);
    await db.settings.clear();
    await loadSettings();
    expect(seenAt('couleur', 'rouge')).toBe(0);
  });

  it('ignore une mémoire illisible', async () => {
    await db.settings.put({ key: SEEN_KEY, value: { couleur: { rouge: 'hier' }, mime: [1] } });
    await loadSettings();
    expect(seenAt('couleur', 'rouge')).toBe(0);
  });
});

it('Devinettes : la partie rejouée pose d’autres devinettes', async () => {
  const user = userEvent.setup();
  await setSetting('rounds', 5);
  window.location.hash = '#/jeu/devinette';
  render(<App />);
  const play = async () => {
    const asked: string[] = [];
    for (let i = 1; i <= 5; i++) {
      asked.push(screen.getByText(/Qui suis-je \?$/).textContent!);
      await user.click(screen.getByRole('button', { name: 'Pas encore' }));
    }
    return asked;
  };
  const first = await play();
  await user.click(screen.getByRole('button', { name: 'Rejouer' }));
  const second = await play();
  expect(new Set([...first, ...second]).size).toBe(10);
});
