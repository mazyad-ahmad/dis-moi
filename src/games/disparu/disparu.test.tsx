import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { findCatalogueGame } from '../catalogue/catalogue';
import { DAILY_SOURCES } from '../defi/daily';
import { suitsMode } from '../modes';
import { revealsInCatalogue } from '../reveal/reveal';
import { buildScene, DISPARU_ID, drawCompanions, placeName, SCENE_RULES } from './disparu';

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const game = findCatalogueGame(DISPARU_ID)!;
const atLevel = (level: number) => game.items.find((i) => i.level === level)!;
const objects = () =>
  within(screen.getByRole('region', { name: 'Objets' }))
    .queryAllByRole('img')
    .map((o) => o.getAttribute('aria-label'));

describe('objets de Qu’est-ce qui a disparu ?', () => {
  it('36 objets sur trois niveaux, chacun avec son image et un indice', () => {
    expect(game.items).toHaveLength(36);
    for (const level of [1, 2, 3])
      expect(game.items.filter((i) => i.level === level)).toHaveLength(12);
    expect(new Set(game.items.map((i) => i.emoji)).size).toBe(36);
    for (const item of game.items) {
      expect(item.emoji).toBeTruthy();
      expect(item.hint).toBeTruthy();
    }
  });

  it('se regarde : au coucher, pas en voiture ; pas d’Image cachée ; dans le défi du jour', () => {
    expect(game.needs).toEqual({ looks: true, moves: false });
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
    expect(suitsMode(game.needs, 'voiture')).toBe(false);
    expect(revealsInCatalogue(game)).toBe(false);
    expect(DAILY_SOURCES.some((s) => s.game === DISPARU_ID)).toBe(true);
  });
});

describe('scène', () => {
  it('de 3 à 6 objets selon le niveau, sans doublon', () => {
    expect([1, 2, 3].map((l) => SCENE_RULES[l as 1 | 2 | 3].count)).toEqual([3, 5, 6]);
    for (const level of [1, 2, 3]) {
      const item = atLevel(level);
      const companions = drawCompanions(item, game.items);
      expect(companions).toHaveLength(SCENE_RULES[item.level as 1 | 2 | 3].count);
      expect(companions).not.toContain(item);
      expect(new Set(companions.map((c) => c.emoji)).size).toBe(companions.length);
      // Du niveau de la carte d'abord.
      for (const c of companions) expect(c.level).toBe(level);
      for (const variant of ['disparu', 'arrive'] as const) {
        const scene = buildScene(item, companions, variant);
        expect(scene.before.filter(Boolean)).toHaveLength(SCENE_RULES[level as 1].count);
      }
    }
  });

  it('petits et moyens : les objets restent à leur place, une case vide', () => {
    for (const level of [1, 2]) {
      const item = atLevel(level);
      const companions = drawCompanions(item, game.items);
      const gone = buildScene(item, companions, 'disparu');
      expect(gone.before[gone.spot]).toBe(item);
      expect(gone.after[gone.spot]).toBeNull();
      gone.before.forEach((s, i) => i !== gone.spot && expect(gone.after[i]).toBe(s));

      const came = buildScene(item, companions, 'arrive');
      expect(came.before).not.toContain(item);
      expect(came.before[came.spot]).toBeNull();
      expect(came.after[came.spot]).toBe(item);
      came.before.forEach((s, i) => i !== came.spot && expect(came.after[i]).toBe(s));
    }
  });

  it('grands : les objets changent de place, sans case vide', () => {
    const item = atLevel(3);
    const companions = drawCompanions(item, game.items);
    const gone = buildScene(item, companions, 'disparu');
    expect(gone.before).toHaveLength(6);
    expect(gone.after).toHaveLength(5);
    expect(gone.after).not.toContain(item);
    expect(gone.after).not.toContain(null);
    expect(gone.after).not.toEqual(gone.before.filter((s) => s !== item));

    const came = buildScene(item, companions, 'arrive');
    expect(came.before).toHaveLength(6);
    expect(came.after).toHaveLength(7);
    expect(came.after[came.spot]).toBe(item);
    const names = (spots: typeof came.after) => spots.map((s) => s!.answer).sort();
    expect(names(came.after)).toEqual(names([...came.before, item]));
  });

  it('dit la place au parent', () => {
    expect(placeName(0, 2, 4)).toBe('en haut à gauche');
    expect(placeName(3, 2, 4)).toBe('en bas à droite');
    expect(placeName(4, 3, 6)).toBe('en bas au milieu');
    expect(placeName(4, 3, 7)).toBe('au milieu');
  });
});

describe('Qu’est-ce qui a disparu ?', () => {
  it('le parent mène : observer, cacher, remontrer ; la réponse est dans son bloc', async () => {
    await setSetting('gameLevel', 1);
    const user = userEvent.setup();
    open(`/jeu/${DISPARU_ID}`);
    expect(screen.getByRole('heading', { name: 'Qu’est-ce qui a disparu ?' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Question' })).toHaveTextContent(
      'Regarde bien tous les objets !',
    );
    // Petits : 3 objets qui restent à leur place. Rien n'avance tout seul.
    const before = objects();
    expect(before).toHaveLength(3);
    expect(screen.getByText('Les objets resteront à leur place.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cacher les objets' }));
    expect(objects()).toHaveLength(0);
    expect(screen.getByRole('region', { name: 'Question' })).toHaveTextContent('Ferme les yeux !');

    await user.click(screen.getByRole('button', { name: 'Remontrer les objets' }));
    expect(screen.getByRole('region', { name: 'Question' })).toHaveTextContent(
      'Qu’est-ce qui a disparu ?',
    );
    const after = objects();
    expect(after).toHaveLength(2);
    const missing = before.find((o) => !after.includes(o))!;

    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    await user.click(within(parent).getByRole('button', { name: 'Voir la réponse' }));
    expect(parent).toHaveTextContent(missing);
    expect(parent).toHaveTextContent(/\((en haut|en bas) à (gauche|droite)\)/);

    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    // Nouvelle manche : on recommence à observer.
    expect(screen.getByRole('button', { name: 'Cacher les objets' })).toBeInTheDocument();
  });

  it('variante : un objet arrive ; les grands voient les objets changer de place', async () => {
    await setSetting('gameLevel', 3);
    const user = userEvent.setup();
    open(`/jeu/${DISPARU_ID}`);
    await user.click(screen.getByRole('radio', { name: 'Un objet arrive' }));
    const before = objects();
    expect(before).toHaveLength(6);
    expect(screen.getByText(/les objets changeront de place/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cacher les objets' }));
    await user.click(screen.getByRole('button', { name: 'Remontrer les objets' }));
    expect(screen.getByRole('region', { name: 'Question' })).toHaveTextContent(
      'Qu’est-ce qui est arrivé ?',
    );
    const after = objects();
    expect(after).toHaveLength(7);
    const newcomer = after.find((o) => !before.includes(o))!;
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    await user.click(within(parent).getByRole('button', { name: 'Voir la réponse' }));
    expect(parent).toHaveTextContent(newcomer);
    expect(parent).toHaveTextContent('Les autres objets ont bougé.');
  });

  it('en montrant : l’enfant retrouve l’objet disparu parmi ceux restés là', async () => {
    await setSetting('gameLevel', 2);
    await setSetting('showChoices', true);
    const user = userEvent.setup();
    open(`/jeu/${DISPARU_ID}`);
    const before = objects();
    expect(before).toHaveLength(5);
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cacher les objets' }));
    await user.click(screen.getByRole('button', { name: 'Remontrer les objets' }));
    const missing = before.find((o) => !objects().includes(o))!;
    const board = screen.getByRole('region', { name: 'Choix de l’enfant' });
    // Moyens : 3 choix.
    expect(within(board).getAllByRole('button')).toHaveLength(3);
    await user.click(within(board).getByRole('button', { name: missing }));
    expect(board).toHaveTextContent(`Oui, c’est ça : ${missing} !`);
  });

  it('se joue dans le Grand Jeu', async () => {
    await setSetting('catalogue', ['mime', DISPARU_ID]);
    await setSetting('grandExcluded', ['chanson', 'lettres', 'dessin']);
    const user = userEvent.setup();
    open('/jeu/grand-jeu');
    let seen = false;
    for (const round of [1, 2]) {
      await user.click(await screen.findByRole('button', { name: /C’est parti/ }));
      const hide = screen.queryByRole('button', { name: 'Cacher les objets' });
      if (hide) {
        seen = true;
        await user.click(hide);
        await user.click(screen.getByRole('button', { name: 'Remontrer les objets' }));
      }
      await user.click(screen.getByRole('button', { name: hide ? 'Pas encore' : 'Passer' }));
      if (round === 1) await screen.findByText('Manche 2 sur 10');
    }
    expect(seen).toBe(true);
  });
});
