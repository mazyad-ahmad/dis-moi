import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { getPack, validatePack } from '../../content/packs';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { findCatalogueGame } from '../catalogue/catalogue';
import { extractLength } from '../chanson/melody';
import { DAILY_SOURCES } from '../defi/daily';
import { suitsMode } from '../modes';
import { TREASURE_ID, treasureSeconds, treasureWay, waitingEvents, WAY_SECONDS } from './treasure';

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

describe('cartes de la chasse au trésor', () => {
  const game = findCatalogueGame(TREASURE_ID)!;

  it('60 consignes sur trois niveaux, chacune avec des idées pour le parent', () => {
    expect(game.items).toHaveLength(60);
    for (const level of [1, 2, 3])
      expect(game.items.filter((i) => i.level === level)).toHaveLength(20);
    for (const item of game.items) {
      expect(item.text).toMatch(/^Trouve quelque chose/);
      expect(item.hint).toBeTruthy();
    }
    // Les quatre familles de consignes : couleur, forme, matière, lettre initiale.
    const tags = new Set(game.items.flatMap((i) => i.tags ?? []));
    for (const tag of ['couleur', 'forme', 'matiere', 'lettre']) expect(tags).toContain(tag);
  });

  it('fait bouger, mais a une version sans courir pour le Coucher et la Voiture', () => {
    expect(game.needs).toEqual({ looks: false, moves: true, still: true });
    expect(game.activities[0]).toBe('bouger');
    for (const mode of ['normal', 'express', 'coucher', 'voiture'] as const)
      expect(suitsMode(game.needs, mode)).toBe(true);
    // Sans version sans courir, un jeu qui fait bouger reste écarté.
    expect(suitsMode({ looks: false, moves: true }, 'coucher')).toBe(false);
    expect(suitsMode({ looks: false, moves: true }, 'voiture')).toBe(false);
    expect(DAILY_SOURCES.some((s) => s.game === TREASURE_ID)).toBe(true);
  });

  it('« still » n’est accepté que pour un jeu qui fait bouger', () => {
    const pack = { ...getPack('devinette'), still: true };
    expect(() => validatePack(pack, 'x.json')).toThrow(/still/);
  });
});

describe('façon de chercher et minuteur', () => {
  it('sans courir imposé au Coucher et en Voiture, pas de minuteur au Coucher', () => {
    expect(treasureWay('run', 'normal')).toBe('run');
    expect(treasureWay('still', 'express')).toBe('still');
    expect(treasureWay('run', 'coucher')).toBe('still');
    expect(treasureWay('run', 'voiture')).toBe('still');
    expect(treasureSeconds('run', 'normal')).toBe(WAY_SECONDS.run);
    expect(treasureSeconds('still', 'voiture')).toBe(WAY_SECONDS.still);
    expect(treasureSeconds('still', 'coucher')).toBe(0);
  });

  it('la musique d’attente dure tout le minuteur', () => {
    for (const seconds of [30, 60]) {
      const events = waitingEvents(seconds);
      expect(extractLength(events)).toBeGreaterThan(seconds - 2);
      expect(extractLength(events)).toBeLessThanOrEqual(seconds);
    }
  });
});

describe('Chasse au trésor', () => {
  afterEach(() => vi.useRealTimers());

  it('le minuteur à zéro ne fait pas perdre : le parent décide', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    open('/jeu/tresor');

    expect(screen.getByRole('heading', { name: 'Chasse au trésor' })).toBeInTheDocument();
    const way = screen.getByRole('radiogroup', { name: 'Façon de chercher' });
    expect(within(way).getByRole('radio', { name: 'Partout' })).toBeChecked();
    const card = screen.getByRole('region', { name: 'Consigne' });
    expect(card).toHaveTextContent(/Trouve quelque chose/);
    expect(card).toHaveTextContent(/reviens le montrer/);
    // Pas de minuteur tant que le parent ne le lance pas.
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lancer le minuteur (1:00)' }));
    expect(screen.getByRole('timer')).toHaveTextContent('1:00');
    act(() => void vi.advanceTimersByTime(61_000));
    expect(screen.getByRole('timer')).toHaveAccessibleName('Temps écoulé');
    expect(screen.getByRole('status')).toHaveTextContent('ce n’est pas grave : le parent décide');
    expect(screen.getByText('Manche 1 sur 10')).toBeInTheDocument();

    // Le parent décide : l'objet est trouvé, l'étoile est gagnée quand même.
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();

    // Version sans courir : l'enfant montre du doigt, minuteur plus court.
    await user.click(within(way).getByRole('radio', { name: 'Sans courir' }));
    expect(screen.getByRole('region', { name: 'Consigne' })).toHaveTextContent(
      /Sans te lever : cherche des yeux et montre-le du doigt/,
    );
    expect(screen.getByRole('button', { name: 'Lancer le minuteur (0:30)' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pas encore' }));
    expect(screen.getByText('Manche 3 sur 10')).toBeInTheDocument();
    expect(within(way).getByRole('radio', { name: 'Sans courir' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Musique d’attente' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('au Coucher : sans courir, sans minuteur', async () => {
    await setSetting('gameMode', 'coucher');
    open('/jeu/tresor');
    expect(
      await screen.findByText('Version sans courir, pour jouer au calme.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Façon de chercher' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Consigne' })).toHaveTextContent(/Sans te lever/);
    expect(screen.queryByRole('button', { name: /Lancer le minuteur/ })).not.toBeInTheDocument();
  });

  it('se joue dans le Grand Jeu avec sa consigne', async () => {
    // Deux jeux inclus : ils alternent, la chasse au trésor tombe en manche 1 ou 2.
    await setSetting('catalogue', ['mime', TREASURE_ID]);
    await setSetting('grandExcluded', ['chanson', 'lettres', 'dessin']);
    const user = userEvent.setup();
    open('/jeu/grand-jeu');
    let seen = false;
    for (const round of [1, 2]) {
      await user.click(await screen.findByRole('button', { name: /C’est parti/ }));
      const card = screen.queryByRole('region', { name: 'Consigne' });
      if (card) {
        seen = true;
        expect(card).toHaveTextContent(/Trouve quelque chose/);
        expect(card).toHaveTextContent(/reviens le montrer/);
        expect(screen.getByRole('button', { name: 'Pas encore' })).toBeInTheDocument();
      }
      await user.click(screen.getByRole('button', { name: card ? 'Pas encore' : 'Passer' }));
      if (round === 1) await screen.findByText('Manche 2 sur 10');
    }
    expect(seen).toBe(true);
  });
});
