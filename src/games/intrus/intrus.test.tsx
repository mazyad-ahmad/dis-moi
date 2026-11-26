import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { getPack, validatePack } from '../../content/packs';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { findCatalogueGame } from '../catalogue/catalogue';
import { DAILY_SOURCES } from '../defi/daily';
import { suitsMode } from '../modes';
import { INTRUS_ID, intrusGrid, SPOTS } from './intrus';

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const game = findCatalogueGame(INTRUS_ID)!;

describe('cartes de l’intrus', () => {
  it('40 cartes sur trois niveaux, chacune avec trois images, l’intrus et sa règle', () => {
    expect(game.items).toHaveLength(40);
    for (const level of [1, 2, 3])
      expect(game.items.filter((i) => i.level === level).length).toBeGreaterThanOrEqual(13);
    for (const item of game.items) {
      expect(item.others).toHaveLength(3);
      expect(item.others).not.toContain(item.emoji);
      expect(item.text).toBeTruthy();
      expect(item.hint).toBeTruthy();
    }
  });

  it('se regarde : pas en voiture, mais au coucher', () => {
    expect(game.needs).toEqual({ looks: true, moves: false });
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
    expect(suitsMode(game.needs, 'voiture')).toBe(false);
    expect(DAILY_SOURCES.some((s) => s.game === INTRUS_ID)).toBe(true);
  });

  it('le pack refuse une carte sans ses trois images ou avec l’intrus dedans', () => {
    const pack = getPack(INTRUS_ID);
    const withItem = (patch: object) => ({ ...pack, items: [{ ...pack.items[0], ...patch }] });
    expect(() => validatePack(withItem({ others: ['🍎', '🍌'] }), 'x.json')).toThrow(/others/);
    expect(() => validatePack(withItem({ others: ['🍎', '🍌', '🚗'] }), 'x.json')).toThrow(
      /parmi les « others »/,
    );
    const question = { ...getPack('devinette') };
    question.items = [{ ...question.items[0], others: ['🍎', '🍌', '🍐'] }];
    expect(() => validatePack(question, 'x.json')).toThrow(/réservé aux packs d’images/);
  });
});

describe('grille', () => {
  it('l’intrus est à une place tirée au hasard, les autres images autour', () => {
    const item = game.items[0];
    const spots = new Set<number>();
    for (const r of [0, 0.3, 0.6, 0.99]) {
      const { images, spot } = intrusGrid(item, () => r);
      expect(images).toHaveLength(4);
      expect(images[spot]).toBe(item.emoji);
      expect([...images].sort()).toEqual([...item.others!, item.emoji!].sort());
      spots.add(spot);
    }
    expect(spots).toEqual(new Set([0, 1, 2, 3]));
    expect(SPOTS).toHaveLength(4);
  });
});

describe('L’intrus', () => {
  it('toucher une image ne valide rien : le parent garde la main', async () => {
    const user = userEvent.setup();
    open(`/jeu/${INTRUS_ID}`);
    expect(screen.getByRole('heading', { name: 'L’intrus' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Question' })).toHaveTextContent(
      'Laquelle ne va pas avec les autres ?',
    );
    const images = within(screen.getByRole('region', { name: 'Images' })).getAllByRole('button');
    expect(images).toHaveLength(4);

    await user.click(images[0]);
    expect(images[0]).toHaveAttribute('aria-pressed', 'true');
    // Ni juste ni faux : la manche ne bouge pas, aucune étoile, le parent décide.
    expect(screen.getByRole('status')).toHaveTextContent('C’est le parent qui valide');
    expect(screen.queryByText(/Oui, c’est ça/)).not.toBeInTheDocument();
    expect(screen.getByText('Manche 1 sur 10')).toBeInTheDocument();
    await user.click(images[1]);
    expect(images[0]).toHaveAttribute('aria-pressed', 'false');
    expect(images[1]).toHaveAttribute('aria-pressed', 'true');

    // Le parent voit l'intrus, sa place et la règle cachée.
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    await user.click(within(parent).getByRole('button', { name: 'Voir la réponse' }));
    expect(parent).toHaveTextContent(/\((en haut|en bas) à (gauche|droite)\)/);

    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    const next = within(screen.getByRole('region', { name: 'Images' })).getAllByRole('button');
    for (const b of next) expect(b).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Pas encore' }));
    expect(screen.getByText('Manche 3 sur 10')).toBeInTheDocument();
  });

  it('se joue dans le Grand Jeu avec sa grille', async () => {
    // Deux jeux inclus : ils alternent, l'intrus tombe en manche 1 ou 2.
    await setSetting('catalogue', ['mime', INTRUS_ID]);
    await setSetting('grandExcluded', ['chanson', 'lettres', 'dessin']);
    const user = userEvent.setup();
    open('/jeu/grand-jeu');
    let seen = false;
    for (const round of [1, 2]) {
      await user.click(await screen.findByRole('button', { name: /C’est parti/ }));
      const grid = screen.queryByRole('region', { name: 'Images' });
      if (grid) {
        seen = true;
        expect(within(grid).getAllByRole('button')).toHaveLength(4);
      }
      await user.click(screen.getByRole('button', { name: grid ? 'Pas encore' : 'Passer' }));
      if (round === 1) await screen.findByText('Manche 2 sur 10');
    }
    expect(seen).toBe(true);
  });
});
