import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
import {
  digital,
  handAngles,
  HEURE_ID,
  heureChoices,
  makeHeure,
  parseTime,
  timeName,
  timeOf,
} from './heure';
import { Clock, HeureRound } from './HeureGame';

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const game = findCatalogueGame(HEURE_ID)!;

describe('heures du jeu', () => {
  it('moyens : les 12 heures pile ; grands : les demies et les quarts', () => {
    const pile = game.items.filter((i) => i.level === 2);
    const quarts = game.items.filter((i) => i.level === 3);
    expect(pile.map((i) => timeOf(i).minute)).toEqual(Array(12).fill(0));
    expect(new Set(quarts.map((i) => timeOf(i).minute))).toEqual(new Set([15, 30, 45]));
    expect(quarts).toHaveLength(36);
    expect(game.items.some((i) => i.level === 1)).toBe(false);
    for (const item of game.items) {
      const time = parseTime(item.text);
      expect(time).toBeDefined();
      // La réponse écrite est celle que donne l'appli.
      expect(item.answer).toBe(timeName(time!));
      expect(item.id).toBe(digital(time!).replace(':', 'h'));
    }
  });

  it('dit l’heure comme on la dit', () => {
    const say = (text: string) => timeName(parseTime(text)!);
    expect(say('3:00')).toBe('3 heures');
    expect(say('1:00')).toBe('une heure');
    expect(say('12:00')).toBe('midi');
    expect(say('3:15')).toBe('3 heures et quart');
    expect(say('3:30')).toBe('3 heures et demie');
    expect(say('12:30')).toBe('midi et demi');
    expect(say('3:45')).toBe('4 heures moins le quart');
    expect(say('11:45')).toBe('midi moins le quart');
    expect(say('12:45')).toBe('une heure moins le quart');
    expect(parseTime('13:00')).toBeUndefined();
    expect(parseTime('3:10')).toBeUndefined();
  });

  it('place les aiguilles : la petite avance avec les minutes', () => {
    expect(handAngles({ hour: 3, minute: 0 })).toEqual({ hour: 90, minute: 0 });
    expect(handAngles({ hour: 12, minute: 0 })).toEqual({ hour: 0, minute: 0 });
    expect(handAngles({ hour: 6, minute: 30 })).toEqual({ hour: 195, minute: 180 });
    expect(handAngles({ hour: 9, minute: 45 })).toEqual({ hour: 292.5, minute: 270 });
  });

  it('le parent a la réponse et l’astuce des aiguilles', () => {
    const card = makeHeure(game.items.find((i) => i.text === '3:45')!);
    expect(card.explain).toMatch(/^4 heures moins le quart, 3:45/);
    expect(card.hints[0]).toBe('La petite aiguille montre les heures, la grande les minutes.');
    expect(card.hints[1]).toMatch(/sur le 9/);
    expect(makeHeure(game.items.find((i) => i.text === '12:00')!).explain).toMatch(/ou minuit/);
  });

  it('choix à montrer : la réponse une fois, sans doublon, dans l’ordre', () => {
    for (const item of game.items)
      for (const count of [2, 3, 4]) {
        const time = timeOf(item);
        const options = heureChoices(time, count, seeded(`${item.id}-${count}`));
        expect(options).toHaveLength(count);
        const keys = options.map(digital);
        expect(new Set(keys).size).toBe(count);
        expect(keys).toContain(digital(time));
        const sorted = [...options].sort((a, b) => a.hour - b.hour || a.minute - b.minute);
        expect(options).toEqual(sorted);
        for (const o of options) expect(parseTime(digital(o))).toBeDefined();
      }
  });

  it('se regarde : au coucher, pas en voiture ; dans le défi, pas en image cachée', () => {
    expect(game.needs).toEqual({ looks: true, moves: false });
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
    expect(suitsMode(game.needs, 'voiture')).toBe(false);
    expect(game.activities).toEqual(['lire-compter']);
    expect(game.levels).toEqual([2, 3]);
    expect(DAILY_SOURCES.some((s) => s.game === HEURE_ID)).toBe(true);
    expect(revealsInCatalogue(game)).toBe(false);
  });
});

describe('l’horloge dessinée', () => {
  it('cadran, 12 chiffres, deux aiguilles, sans dire l’heure', () => {
    const { container } = render(<Clock time={{ hour: 3, minute: 15 }} />);
    const clock = screen.getByRole('img', { name: 'Horloge à aiguilles' });
    expect(clock.tagName.toLowerCase()).toBe('svg');
    expect([...clock.querySelectorAll('text')].map((t) => t.textContent)).toEqual(
      Array.from({ length: 12 }, (_, i) => String(i + 1)),
    );
    const hour = container.querySelector('.heure-clock__hand--hour')!;
    const minute = container.querySelector('.heure-clock__hand--minute')!;
    const length = (el: Element) =>
      Math.hypot(Number(el.getAttribute('x2')), Number(el.getAttribute('y2')));
    // La petite aiguille est plus courte que la grande.
    expect(length(hour)).toBeLessThan(length(minute));
    // 3 h 15 : la grande aiguille pointe vers le 3, à droite.
    expect(Number(minute.getAttribute('x2'))).toBeGreaterThan(70);
    expect(Math.abs(Number(minute.getAttribute('y2')))).toBeLessThan(1);
    // Aucune couleur écrite en dur dans le dessin : tout vient du thème.
    for (const el of clock.querySelectorAll('*')) {
      expect(el.getAttribute('fill')).toBeNull();
      expect(el.getAttribute('stroke')).toBeNull();
    }
  });

  it('lisible en mode sombre : les couleurs sont les jetons du thème', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/games/heure/heure.css'), 'utf8');
    const colors = [...css.matchAll(/(?:fill|stroke|color|background):\s*([^;]+);/g)].map((m) =>
      m[1].trim(),
    );
    expect(colors.length).toBeGreaterThan(5);
    for (const color of colors) expect(color).toMatch(/^var\(--[a-z-]+\)$/);
    // Le cadran prend le fond des cartes, les chiffres et la petite aiguille l'encre :
    // deux jetons redéfinis ensemble pour la nuit, donc toujours contrastés.
    expect(css).toMatch(/\.heure-clock__face \{[^}]*fill: var\(--paper\)/);
    expect(css).toMatch(/\.heure-clock__number \{[^}]*fill: var\(--ink\)/);
  });
});

describe('Quelle heure est-il ?', () => {
  it('le parent lit la question, voit la réponse et valide', async () => {
    await setSetting('gameLevel', 2);
    const user = userEvent.setup();
    open(`/jeu/${HEURE_ID}`);
    expect(screen.getByRole('heading', { name: 'Quelle heure est-il ?' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Question' })).toHaveTextContent(
      'Quelle heure est-il ?',
    );
    expect(
      within(screen.getByRole('region', { name: 'Horloge' })).getByRole('img', {
        name: 'Horloge à aiguilles',
      }),
    ).toBeInTheDocument();
    // À voix haute : pas de choix à toucher.
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();

    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    await user.click(within(parent).getByRole('button', { name: 'Un indice' }));
    expect(parent).toHaveTextContent('La petite aiguille montre les heures');
    await user.click(within(parent).getByRole('button', { name: 'Voir la réponse' }));
    // Moyens : une heure pile.
    expect(parent).toHaveTextContent(/(heures?|midi(?: \(ou minuit\))?), \d{1,2}:00/);
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
  });

  it('en montrant, l’enfant touche l’heure en chiffres parmi les choix', async () => {
    await setSetting('gameLevel', 3);
    await setSetting('showChoices', true);
    const user = userEvent.setup();
    open(`/jeu/${HEURE_ID}`);
    const board = screen.getByRole('region', { name: 'Choix de l’enfant' });
    const options = within(board).getAllByRole('button');
    expect(options).toHaveLength(4);
    for (const option of options) expect(option).toHaveTextContent(/^\d{1,2}:(15|30|45)$/);
    const status = within(board).getByRole('status');
    let right = 0;
    for (const option of options) {
      await user.click(option);
      if (status.textContent?.includes('Oui, c’est ça')) right++;
      if (right) break;
      expect(status).toHaveTextContent('');
    }
    expect(right).toBe(1);
    expect(screen.getByText('Manche 1 sur 10')).toBeInTheDocument();
  });

  it('dans le Défi du jour, l’horloge sans choix', async () => {
    await setSetting('showChoices', true);
    render(<HeureRound item={game.items[0]} choices={false} />);
    expect(screen.getByRole('img', { name: 'Horloge à aiguilles' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();
  });

  it('se joue dans le Grand Jeu avec son horloge', async () => {
    await setSetting('catalogue', ['mime', HEURE_ID]);
    await setSetting('grandExcluded', ['chanson', 'lettres', 'dessin', 'raconte']);
    const user = userEvent.setup();
    open('/jeu/grand-jeu');
    let seen = false;
    for (const round of [1, 2]) {
      await user.click(await screen.findByRole('button', { name: /C’est parti/ }));
      const clock = screen.queryByRole('region', { name: 'Horloge' });
      if (clock) seen = true;
      await user.click(screen.getByRole('button', { name: clock ? 'Pas encore' : 'Passer' }));
      if (round === 1) await screen.findByText('Manche 2 sur 10');
    }
    expect(seen).toBe(true);
  });
});
