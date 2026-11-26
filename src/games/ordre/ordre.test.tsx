import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { getPack, validatePack } from '../../content/packs';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { findCatalogueGame } from '../catalogue/catalogue';
import { DAILY_SOURCES } from '../defi/daily';
import { suitsMode } from '../modes';
import { revealsInCatalogue } from '../reveal/reveal';
import { isInOrder, mixedOrder, moveTo, ORDRE_ID, STEPS_BY_LEVEL } from './ordre';

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const game = findCatalogueGame(ORDRE_ID)!;
const board = () => screen.getByRole('region', { name: 'Images à remettre dans l’ordre' });
/** Textes des images, dans l'ordre affiché. */
const shown = () =>
  within(board())
    .getAllByRole('button', { name: /, place \d sur \d$/ })
    .map((b) => b.getAttribute('aria-label')!.replace(/, place \d sur \d$/, ''));
/** Ordre attendu de la carte de la manche, retrouvée d'après ses images. */
const expectedOrder = () => {
  const key = (texts: string[]) => [...texts].sort().join('|');
  const card = game.items.find((i) => key(i.steps!.map((s) => s.text)) === key(shown()))!;
  return card.steps!.map((s) => s.text);
};
const tile = (text: string) =>
  within(board()).getByRole('button', {
    name: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, place`),
  });

describe('séquences de Remets dans l’ordre', () => {
  it('30 séquences : 3 étapes pour les petits, 4 pour les moyens, 5 pour les grands', () => {
    expect(game.items).toHaveLength(30);
    for (const level of [1, 2, 3] as const) {
      const cards = game.items.filter((i) => i.level === level);
      expect(cards).toHaveLength(10);
      for (const card of cards) expect(card.steps).toHaveLength(STEPS_BY_LEVEL[level]);
    }
    for (const item of game.items) {
      expect(item.text).toBeTruthy();
      expect(item.hint).toBeTruthy();
    }
  });

  it('les thèmes de l’issue sont là : routines, graine, saisons, semaine, journée', () => {
    const answers = game.items.map((i) => i.answer);
    for (const name of [
      'Se laver les mains',
      'Se brosser les dents',
      'S’habiller',
      'Aller au lit',
      'La graine qui pousse',
      'Les saisons',
      'Les jours de la semaine',
      'Les moments de la journée',
    ])
      expect(answers).toContain(name);
    // Lavage des mains : eau, savon, rinçage, séchage, dans cet ordre.
    const mains = game.items.find((i) => i.id === 'laver-mains')!;
    expect(mains.steps!.map((s) => s.text)).toEqual([
      'Mouiller ses mains',
      'Frotter avec du savon',
      'Bien rincer',
      'Sécher ses mains',
    ]);
  });

  it('se regarde : au coucher, pas en voiture ; pas d’Image cachée ; dans le défi du jour', () => {
    expect(game.needs).toEqual({ looks: true, moves: false });
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
    expect(suitsMode(game.needs, 'voiture')).toBe(false);
    expect(revealsInCatalogue(game)).toBe(false);
    expect(DAILY_SOURCES.some((s) => s.game === ORDRE_ID)).toBe(true);
  });

  it('le pack refuse des étapes trop peu nombreuses, en double ou mal écrites', () => {
    const pack = getPack(ORDRE_ID);
    const withItem = (patch: object) => ({ ...pack, items: [{ ...pack.items[0], ...patch }] });
    const step = (text: string, emoji?: string) => ({ text, ...(emoji && { emoji }) });
    expect(() => validatePack(withItem({ steps: [step('A'), step('B')] }), 'x.json')).toThrow(
      /3 à 5 étapes/,
    );
    expect(() =>
      validatePack(withItem({ steps: [step('A'), step('A'), step('B')] }), 'x.json'),
    ).toThrow(/texte en double/);
    expect(() =>
      validatePack(withItem({ steps: [step('A', '🌱'), step('B', '🌱'), step('C')] }), 'x.json'),
    ).toThrow(/emoji en double/);
    expect(() =>
      validatePack(withItem({ steps: [step('A'), step('B'), { text: 'C', img: 'x' }] }), 'x.json'),
    ).toThrow(/champ inconnu « img »/);
    const question = { ...getPack('devinette') };
    question.items = [{ ...question.items[0], steps: [step('A'), step('B'), step('C')] }];
    expect(() => validatePack(question, 'x.json')).toThrow(/réservé aux packs d’images/);
  });
});

describe('ordre', () => {
  it('le mélange de départ n’est jamais déjà dans le bon ordre', () => {
    for (const n of [3, 4, 5])
      for (const r of [0, 0.2, 0.5, 0.99]) {
        const order = mixedOrder(n, () => r);
        expect([...order].sort()).toEqual([...Array(n).keys()]);
        expect(isInOrder(order)).toBe(false);
      }
  });

  it('déplacer une image fait glisser les autres', () => {
    expect(moveTo(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveTo(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveTo(['a', 'b', 'c'], 1, 5)).toEqual(['a', 'b', 'c']);
  });
});

describe('Remets dans l’ordre', () => {
  it('au doigt : toucher une image puis sa place ; le parent valide', async () => {
    await setSetting('gameLevel', 1);
    const user = userEvent.setup();
    open(`/jeu/${ORDRE_ID}`);
    expect(screen.getByRole('heading', { name: 'Remets dans l’ordre' })).toBeInTheDocument();
    expect(shown()).toHaveLength(3);
    const status = within(board()).getByRole('status');
    expect(status).toHaveTextContent('Touche une image, puis la place où la mettre.');

    // L'ordre attendu est dans le bloc du parent.
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    await user.click(within(parent).getByRole('button', { name: 'Voir la réponse' }));
    const expected = expectedOrder();
    expect(expected).toHaveLength(3);
    expect(
      within(parent)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(expect.arrayContaining([expect.stringContaining(expected[0])]));
    expect(shown()).not.toEqual(expected);

    for (const [place, text] of expected.entries()) {
      if (shown()[place] === text) continue;
      await user.click(tile(text));
      expect(tile(text)).toHaveAttribute('aria-pressed', 'true');
      expect(status).toHaveTextContent(`Touche la place où mettre « ${text} »`);
      await user.click(tile(shown()[place]));
    }
    expect(shown()).toEqual(expected);
    expect(status).toHaveTextContent('Tout est dans l’ordre !');
    // Rien n'avance tout seul : c'est le parent qui valide.
    expect(screen.getByText('Manche 1 sur 10')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
  });

  it('au clavier : les flèches déplacent l’image, qui garde le focus', async () => {
    await setSetting('gameLevel', 3);
    const user = userEvent.setup();
    open(`/jeu/${ORDRE_ID}`);
    expect(shown()).toHaveLength(5);
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    await user.click(within(parent).getByRole('button', { name: 'Voir la réponse' }));
    const target = expectedOrder();

    for (const [place, text] of target.entries()) {
      const from = shown().indexOf(text);
      tile(text).focus();
      for (let i = from; i > place; i--) await user.keyboard('{ArrowUp}');
      expect(tile(text)).toHaveFocus();
    }
    expect(shown()).toEqual(target);
    expect(within(board()).getByRole('status')).toHaveTextContent('Tout est dans l’ordre !');

    // Fin et début de liste au clavier, et les boutons Avant / Après.
    tile(target[0]).focus();
    await user.keyboard('{End}');
    expect(shown().at(-1)).toBe(target[0]);
    expect(tile(target[0])).toHaveFocus();
    expect(within(board()).getByRole('button', { name: `Après : ${target[0]}` })).toBeDisabled();
    await user.click(within(board()).getByRole('button', { name: `Avant : ${target[0]}` }));
    expect(shown().indexOf(target[0])).toBe(3);
    await user.keyboard('{Home}');
    expect(shown()).toEqual(target);
  });

  it('le parent peut montrer le bon ordre', async () => {
    await setSetting('gameLevel', 2);
    const user = userEvent.setup();
    open(`/jeu/${ORDRE_ID}`);
    const before = shown();
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    await user.click(within(parent).getByRole('button', { name: 'Voir la réponse' }));
    await user.click(within(parent).getByRole('button', { name: 'Montrer le bon ordre' }));
    expect(shown()).not.toEqual(before);
    expect(within(board()).getByRole('status')).toHaveTextContent('Voilà le bon ordre !');
  });

  it('se joue dans le Grand Jeu avec ses images', async () => {
    await setSetting('catalogue', ['mime', ORDRE_ID]);
    await setSetting('grandExcluded', ['chanson', 'lettres', 'dessin']);
    const user = userEvent.setup();
    open('/jeu/grand-jeu');
    let seen = false;
    for (const round of [1, 2]) {
      await user.click(await screen.findByRole('button', { name: /C’est parti/ }));
      const images = screen.queryByRole('region', { name: 'Images à remettre dans l’ordre' });
      if (images) {
        seen = true;
        expect(shown().length).toBeGreaterThanOrEqual(3);
      }
      await user.click(screen.getByRole('button', { name: images ? 'Pas encore' : 'Passer' }));
      if (round === 1) await screen.findByText('Manche 2 sur 10');
    }
    expect(seen).toBe(true);
  });
});
