import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { findCatalogueGame } from '../catalogue/catalogue';
import { DAILY_SOURCES } from '../defi/daily';
import { grandGames } from '../grand/pool';
import { LEVELS } from '../levels';
import { suitsMode } from '../modes';
import {
  ideasOf,
  IDEAS_LABEL,
  NO_STAR_MESSAGE,
  REASSURE_TAG,
  SITUATION_ID,
  situationsFor,
  THANKS_LABEL,
} from './situation';

const game = findCatalogueGame(SITUATION_ID)!;

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
  await setSetting('rounds', 3);
});

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const textsOf = (item: (typeof game.items)[number]) =>
  [item.text, ...ideasOf(item), item.talk].join(' ');

describe('situations de Que fais-tu si… ?', () => {
  it('40 situations réparties sur les trois niveaux, chacune avec des pistes et de quoi en parler', () => {
    expect(game.name).toBe('Que fais-tu si… ?');
    expect(game.items).toHaveLength(40);
    for (const { value: level } of LEVELS)
      expect(game.items.filter((i) => i.level === level).length).toBeGreaterThanOrEqual(13);
    for (const item of game.items) {
      expect(item.text, item.answer).toBeTruthy();
      expect(ideasOf(item).length, item.answer).toBeGreaterThanOrEqual(2);
      expect(item.talk, item.answer).toMatch(/ \?$/);
      expect(item.emoji, item.answer).toBeTruthy();
    }
  });

  // Relecture outillée : rien de danger, d'abandon ni de violence pour les Petits et les Moyens.
  it('rien d’effrayant pour les petits ; « perdu au magasin » réservé aux grands, rassurant', () => {
    const scary =
      /perdu|perdre|danger|peur|cauchemar|effra|seul|abandon|inconnu|frapp|tape|pousse|mord|griff|bless|sang|hurl|crie|pompier|police|feu\b|noir|nuit noire|disparu|mort|malade|hôpital/i;
    for (const item of game.items.filter((i) => i.level !== 3)) {
      expect(textsOf(item), item.answer).not.toMatch(scary);
      expect(item.tags ?? [], item.answer).not.toContain(REASSURE_TAG);
    }
    const shop = game.items.find((i) => i.id === 'magasin')!;
    expect(shop.level).toBe(3);
    expect(shop.tags).toContain(REASSURE_TAG);
    expect(shop.text).toMatch(/te cherche/);
    expect(shop.talk).toMatch(/On se retrouve toujours/);
  });

  it('des pistes bienveillantes, jamais culpabilisantes', () => {
    const blame =
      /pourquoi|faute|bêtise|méchant|vilain|puni|honte|gronde|pas bien|aurais dû|il faut|interdit|nul\b/i;
    for (const item of game.items) expect(textsOf(item), item.answer).not.toMatch(blame);
  });

  it('jouable en Voiture et au Coucher, ni dans le Grand Jeu ni dans le défi', () => {
    expect(suitsMode(game.needs, 'voiture')).toBe(true);
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
    expect(game.levels).toEqual([1, 2, 3]);
    // Sans bonne réponse : pas de manche « Trouvé » dans le Grand Jeu, pas de défi du jour.
    expect(grandGames([game], []).map((g) => g.id)).not.toContain(SITUATION_ID);
    expect(DAILY_SOURCES.map((s) => s.game)).not.toContain(SITUATION_ID);
  });

  it('au coucher, rien qui demande d’être rassuré', () => {
    expect(situationsFor(game.items, 'coucher').map((i) => i.id)).not.toContain('magasin');
    expect(situationsFor(game.items, 'voiture')).toHaveLength(40);
  });
});

describe('une partie de Que fais-tu si… ?', () => {
  it('« On en a parlé » donne l’étoile ; les pistes et la question attendent le parent', async () => {
    const user = userEvent.setup();
    open(`/jeu/${SITUATION_ID}`);
    expect(await screen.findByText('Manche 1 sur 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Que fais-tu si… ?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Trouvé' })).not.toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Situation' });
    expect(card).toHaveTextContent('Que fais-tu ?');
    const text = card.querySelector('.deck-card__question')!.textContent!;
    const item = game.items.find((i) => i.text === text)!;

    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    expect(parent).toHaveTextContent('Pas de bonne ou de mauvaise réponse');
    expect(within(parent).queryByText(item.talk!)).not.toBeInTheDocument();
    await user.click(within(parent).getByRole('button', { name: IDEAS_LABEL }));
    const ideas = within(parent).getByRole('list', { name: 'Pistes' });
    expect(within(ideas).getAllByRole('listitem')).toHaveLength(ideasOf(item).length);
    expect(within(parent).getByText(item.talk!)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: THANKS_LABEL }));
    expect(await screen.findByText('Manche 2 sur 3')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    // Nouvelle manche : les pistes sont refermées.
    expect(screen.getByRole('button', { name: IDEAS_LABEL })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Passer' }));
    expect(await screen.findByText('Manche 3 sur 3')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: THANKS_LABEL }));
    expect(
      await screen.findByRole('heading', { name: '2 étoiles gagnées ensemble !' }),
    ).toBeInTheDocument();
  });

  it('tout passer finit sur un mot doux', async () => {
    const user = userEvent.setup();
    open(`/jeu/${SITUATION_ID}`);
    for (let i = 1; i <= 3; i++) {
      expect(await screen.findByText(`Manche ${i} sur 3`)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Passer' }));
    }
    expect(await screen.findByText(NO_STAR_MESSAGE)).toBeInTheDocument();
    await waitFor(async () =>
      expect(await db.games.toArray()).toMatchObject([
        { gameId: SITUATION_ID, played: 3, stars: 0 },
      ]),
    );
  });

  it('se joue en mode Voiture depuis l’accueil, au niveau de la partie', async () => {
    const user = userEvent.setup();
    await setSetting('catalogue', [SITUATION_ID]);
    await setSetting('gameMode', 'voiture');
    await setSetting('gameLevel', 1);
    open('/');
    await user.click(await screen.findByRole('link', { name: /Que fais-tu si/ }));
    expect(await screen.findByText('Manche 1 sur 3')).toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Situation' });
    const text = card.querySelector('.deck-card__question')!.textContent!;
    expect(game.items.find((i) => i.text === text)!.level).toBe(1);
  });
});
