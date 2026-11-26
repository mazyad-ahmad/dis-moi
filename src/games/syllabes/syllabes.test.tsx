import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { findCatalogueGame } from '../catalogue/catalogue';
import type { DeckItem } from '../deck/types';
import { DeckRound } from '../deck/DeckGame';
import { DAILY_ID, dailyPick, dayKey } from '../defi/daily';
import { suitsMode } from '../modes';
import { inCountOrder, MAX_SYLLABES, SYLLABES_OPTIONS, syllabesOf } from './syllabes';

// #127 : Tape les syllabes, un jeu oral qui se joue avec les mains.

const game = findCatalogueGame('syllabes')!;
const words = game.items.filter((i) => syllabesOf(i)?.kind === 'mot');
const finds = game.items.filter((i) => syllabesOf(i)?.kind === 'trouve');
const countOf = (item: DeckItem) => syllabesOf(item)!.count;

describe('Tape les syllabes : le pack', () => {
  it('80 mots, de 1 à 4 syllabes, sur les trois niveaux', () => {
    expect(words).toHaveLength(80);
    for (const count of [1, 2, 3, 4])
      expect(words.filter((i) => countOf(i) === count).length).toBeGreaterThanOrEqual(8);
    for (const level of [1, 2, 3])
      expect(words.filter((i) => i.level === level).length).toBeGreaterThanOrEqual(25);
    // Les petits : des mots courts ; les grands : les plus longs.
    expect(Math.max(...words.filter((i) => i.level === 1).map(countOf))).toBe(2);
    expect(words.filter((i) => i.level === 3 && countOf(i) === 4)).toHaveLength(10);
  });

  it('chaque mot est découpé sans perdre de lettre, en morceaux qui se disent', () => {
    for (const item of words) {
      const { parts } = syllabesOf(item) as { parts: string[] };
      expect(parts.join('')).toBe(item.text!.toLocaleLowerCase('fr'));
      expect(parts.length).toBeLessThanOrEqual(MAX_SYLLABES);
      for (const part of parts) expect(part).toMatch(/[aeiouyéèêâ]/);
      // Découpage oral : un « e » final qui ne se dit pas reste collé à la syllabe d'avant.
      expect(parts.at(-1)).not.toMatch(/^[^aeiouyéèêâ]+e$/);
      if (/([^aeiouyéè]|qu)e$/.test(item.text!)) expect(item.hint).toMatch(/ne se dit pas/);
    }
    const cut = (text: string) => syllabesOf(words.find((i) => i.text === text)!);
    expect(cut('Chocolat')).toMatchObject({ parts: ['cho', 'co', 'lat'], count: 3 });
    expect(cut('Pomme')).toMatchObject({ count: 1 });
    expect(cut('Girafe')).toMatchObject({ parts: ['gi', 'rafe'], count: 2 });
  });

  it('variante des grands : trouver un mot qui a tant de syllabes, avec des exemples justes', () => {
    expect(finds.length).toBeGreaterThanOrEqual(4);
    for (const item of finds) {
      expect(item.level).toBe(3);
      expect(item.text).toMatch(/^Trouve un .+ qui a \d syllabes?\.$/);
      const found = syllabesOf(item) as { examples: string[]; count: number };
      expect(found.examples.length).toBeGreaterThanOrEqual(2);
      for (const example of found.examples) expect(example.split('-')).toHaveLength(found.count);
    }
  });

  it('est un jeu oral, jouable en Voiture et au Coucher', () => {
    expect(game.kind).toBe('question');
    expect(suitsMode(game.needs, 'voiture')).toBe(true);
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
  });

  it('ne s’applique qu’aux cartes du jeu', () => {
    expect(syllabesOf({ answer: 'cho-co-lat' })).toBeUndefined();
    expect(inCountOrder([...SYLLABES_OPTIONS].reverse()).map((o) => o.key)).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
  });
});

describe('Tape les syllabes, en jeu', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
    await loadSettings();
    await setSetting('catalogue', ['syllabes']);
  });

  async function play() {
    window.location.hash = '#/jeu/syllabes';
    render(<App />);
    const card = await screen.findByRole('region', { name: 'Question' });
    const text = within(card).getByText(/\S/, { selector: '.deck-card__question' }).textContent;
    return game.items.find((i) => i.text === text)!;
  }

  it('le parent lit le mot et voit d’emblée le découpage et le nombre de syllabes', async () => {
    const user = userEvent.setup();
    await setSetting('gameLevel', 1);
    const item = await play();
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    const { parts, count } = syllabesOf(item) as { parts: string[]; count: number };
    expect(within(parent).getByText(parts.join(' - '))).toBeInTheDocument();
    expect(within(parent).getByText(count > 1 ? `${count} syllabes` : '1 syllabe')).toBeVisible();
    expect(within(parent).getByText(/tape une fois dans ses mains/)).toBeInTheDocument();
    // Rien à dévoiler : on enchaîne.
    expect(screen.queryByRole('button', { name: 'Voir la réponse' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
  });

  it('en Voiture : on compte à voix haute, sans taper, et rien à regarder', async () => {
    await setSetting('showChoices', true);
    await setSetting('gameMode', 'voiture');
    await setSetting('gameLevel', 2);
    const item = await play();
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    const { parts } = syllabesOf(item) as { parts: string[] };
    expect(
      within(parent).getByText(/^Sans taper : l’enfant compte à voix haute/),
    ).toHaveTextContent(parts.map((p, i) => `« ${p} » ${i + 1}`).join(', '));
    expect(within(parent).queryByText(/tape une fois/)).not.toBeInTheDocument();
  });

  it('en montrant : des nombres de syllabes, dans l’ordre, la bonne réponse parmi eux', async () => {
    const user = userEvent.setup();
    await setSetting('showChoices', true);
    await setSetting('gameLevel', 2);
    const item = await play();
    const board = screen.getByRole('region', { name: 'Choix de l’enfant' });
    const shown = within(board).getAllByRole('button');
    expect(shown).toHaveLength(3);
    const labels = shown.map((b) => b.getAttribute('aria-label')!);
    expect(labels).toEqual([...labels].sort());
    const right = `${countOf(item)} syllabe${countOf(item) > 1 ? 's' : ''}`;
    expect(labels).toContain(right);
    await user.click(within(board).getByRole('button', { name: right }));
    expect(within(board).getByRole('status')).toHaveTextContent(`Oui, c’est ça : ${right} !`);
  });

  it('variante des grands : le parent a des exemples, l’enfant n’a rien à montrer', async () => {
    await setSetting('showChoices', true);
    const item = finds.find((i) => i.id === 'trouve-3')!;
    render(<DeckRound kind="question" item={item} pool={game.items} />);
    expect(screen.getByText('Trouve un mot qui a 3 syllabes.')).toBeInTheDocument();
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    expect(within(parent).getByText('Un mot de 3 syllabes')).toBeInTheDocument();
    expect(within(parent).getByText(item.answer)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Ça commence par/)).not.toBeInTheDocument();
  });

  it('défi du jour : la même zone du parent, sans « Voir la réponse »', async () => {
    let day = new Date(2026, 0, 1, 12);
    while (dailyPick(dayKey(day)).source.game !== 'syllabes')
      day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 12);
    const { card } = dailyPick(dayKey(day));
    const item = (card as { item: DeckItem }).item;
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(day);
      window.location.hash = `#/jeu/${DAILY_ID}`;
      render(<App />);
      const parent = await screen.findByRole('region', { name: 'Pour le parent' });
      expect(within(parent).getByText(/^\d syllabes?$|^Un mot de \d syllabes?$/)).toBeVisible();
      expect(screen.getByText(item.text!)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Voir la réponse' })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
