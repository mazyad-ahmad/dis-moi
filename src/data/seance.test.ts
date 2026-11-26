import {
  beginGame,
  endGame,
  extend,
  getSeance,
  PAUSE_RESET_MS,
  resetSeance,
  touch,
} from './seance';
import { setSetting } from './settings';

const MIN = 60_000;

beforeEach(async () => {
  await setSetting('sessionMinutes', 10);
  resetSeance();
});

/** Joue une partie de `minutes` minutes à partir de `start` ; renvoie l'heure de fin. */
function play(start: number, minutes: number): number {
  beginGame(start);
  touch(start + (minutes * MIN) / 2);
  endGame(start + minutes * MIN);
  return start + minutes * MIN;
}

it('réglage désactivé : aucune séance', async () => {
  await setSetting('sessionMinutes', 0);
  beginGame(0);
  endGame(60 * MIN);
  expect(getSeance(60 * MIN)).toEqual({
    active: false,
    over: false,
    lastGame: false,
    nextIsLast: false,
  });
});

it('annonce la dernière partie, puis termine la séance après elle', () => {
  let t = play(0, 4);
  expect(getSeance(t)).toMatchObject({ over: false, nextIsLast: false });
  t = play(t, 4);
  // 2 minutes restantes, moins qu'une partie : « Encore une partie, et après on range ».
  expect(getSeance(t)).toMatchObject({ over: false, nextIsLast: true });
  beginGame(t);
  expect(getSeance(t)).toMatchObject({ lastGame: true, nextIsLast: false });
  endGame(t + 4 * MIN);
  expect(getSeance(t + 4 * MIN)).toMatchObject({ over: true, lastGame: false });
});

it('la partie commencée avant l’échéance va jusqu’au bout', () => {
  beginGame(0);
  touch(15 * MIN);
  expect(getSeance(15 * MIN).over).toBe(false);
  endGame(20 * MIN);
  expect(getSeance(20 * MIN).over).toBe(true);
});

it('une pause de plus de 30 minutes remet le temps à zéro', () => {
  beginGame(0);
  endGame(12 * MIN);
  expect(getSeance(12 * MIN).over).toBe(true);
  const later = 12 * MIN + PAUSE_RESET_MS + 1;
  expect(getSeance(later).active).toBe(false);
  beginGame(later);
  expect(getSeance(later)).toMatchObject({ over: false, lastGame: false });
});

it('le parent prolonge de 10 minutes à partir de maintenant', () => {
  beginGame(0);
  endGame(25 * MIN);
  extend(26 * MIN);
  expect(getSeance(26 * MIN).over).toBe(false);
  // Assez de temps pour une partie de plus que la dernière (25 min) ? Non : c'est la dernière.
  beginGame(26 * MIN);
  expect(getSeance(26 * MIN).lastGame).toBe(true);
});

it('survit à un rechargement du module (localStorage)', async () => {
  beginGame(Date.now());
  endGame(Date.now() + 20 * MIN);
  const { vi } = await import('vitest');
  vi.resetModules();
  const fresh = await import('./seance');
  const settings = await import('./settings');
  await settings.setSetting('sessionMinutes', 10);
  expect(fresh.getSeance(Date.now() + 20 * MIN).over).toBe(true);
});
