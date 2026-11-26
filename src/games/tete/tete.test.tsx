import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { resetAudioForTests } from '../../audio/context';
import { answerSound, UI_SOUNDS } from '../../audio/sounds';
import { db } from '../../data/db';
import { REWARDS } from '../../data/history';
import { loadSettings, setSetting } from '../../data/settings';
import { FakeContext, played, resetFakeAudio } from '../../test/fakeAudio';
import { findCatalogueGame } from '../catalogue/catalogue';
import { DAILY_SOURCES } from '../defi/daily';
import { grandGames } from '../grand/pool';
import { suitsMode } from '../modes';
import { revealsInCatalogue } from '../reveal/reveal';
import {
  ARM_MS,
  nextTilt,
  poseOf,
  screenFacing,
  sideOf,
  TETE_ID,
  TILT_START,
  type TiltPose,
} from './tilt';

const game = findCatalogueGame(TETE_ID)!;
const starNotes = UI_SOUNDS.star.tones.map((t) => t.freq);
const passNotes = UI_SOUNDS.pass.tones.map((t) => t.freq);
// Première étoile de la famille : c'est le son de la récompense « 1 étoile » qui est joué.
const firstStarNotes = UI_SOUNDS.reward.tones.map((t) => t.freq);

beforeEach(async () => {
  sessionStorage.clear();
  resetFakeAudio();
  resetAudioForTests();
  vi.stubGlobal('AudioContext', FakeContext);
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Navigateur sans capteur d'inclinaison (ordinateur, vieux téléphone). */
function noSensor() {
  const w = window as { DeviceOrientationEvent?: unknown };
  const saved = w.DeviceOrientationEvent;
  delete w.DeviceOrientationEvent;
  onTestFinished(() => {
    if (saved !== undefined) w.DeviceOrientationEvent = saved;
  });
}

function open() {
  window.location.hash = `#/jeu/${TETE_ID}`;
  return render(<App />);
}

/** Capteur d'inclinaison simulé ; `permission` : comme sur iPhone, une autorisation à demander. */
function fakeSensor(permission?: 'granted' | 'denied') {
  const requestPermission = vi.fn(() => Promise.resolve(permission ?? 'granted'));
  class FakeOrientationEvent extends Event {}
  if (permission)
    Object.assign(FakeOrientationEvent, { requestPermission: requestPermission as unknown });
  vi.stubGlobal('DeviceOrientationEvent', FakeOrientationEvent);
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  const tilt = (beta: number, gamma: number, after = 50) => {
    now += after;
    act(() => {
      window.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta, gamma }));
    });
  };
  return { requestPermission, tilt };
}

describe('cartes de Devine-tête', () => {
  it('45 mots sur trois niveaux, chacun avec son image et une idée pour le faire deviner', () => {
    expect(game.items).toHaveLength(45);
    for (const level of [1, 2, 3])
      expect(game.items.filter((i) => i.level === level)).toHaveLength(15);
    for (const item of game.items) {
      expect(item.emoji).toBeTruthy();
      expect(item.hint).toBeTruthy();
    }
  });

  it('on mime et on regarde l’écran : ni au coucher, ni en voiture', () => {
    expect(game.needs).toEqual({ looks: true, moves: true });
    expect(suitsMode(game.needs, 'coucher')).toBe(false);
    expect(suitsMode(game.needs, 'voiture')).toBe(false);
    expect(revealsInCatalogue(game)).toBe(false);
  });

  it('téléphone sur le front : ni dans le Grand Jeu, ni en défi du jour', () => {
    expect(DAILY_SOURCES.some((s) => s.game === TETE_ID)).toBe(false);
    expect(grandGames([game], [])).toEqual([]);
  });
});

describe('inclinaison', () => {
  it('dit où regarde l’écran, quel que soit le sens du téléphone', () => {
    expect(screenFacing(0, 0)).toBeCloseTo(1); // à plat, écran vers le plafond
    expect(screenFacing(180, 0)).toBeCloseTo(-1); // à plat, écran vers le sol
    expect(screenFacing(90, 0)).toBeCloseTo(0); // debout en portrait
    expect(screenFacing(0, 90)).toBeCloseTo(0); // debout en paysage
    expect(poseOf(screenFacing(0, 85))).toBe('upright');
    expect(poseOf(screenFacing(0, 40))).toBe('up');
    expect(poseOf(screenFacing(180, 40))).toBe('down');
    expect(poseOf(screenFacing(0, 62))).toBe('between');
    expect(sideOf(80)).toBe('right');
    expect(sideOf(-80)).toBe('left');
    expect(sideOf(10)).toBeUndefined();
  });

  it('un geste compte une fois, puis il faut revenir debout', () => {
    const run = (steps: [TiltPose, number][]) => {
      let state = TILT_START;
      const gestures: string[] = [];
      for (const [pose, at] of steps) {
        const next = nextTilt(state, pose, at);
        state = next.state;
        if (next.gesture) gestures.push(next.gesture);
      }
      return gestures;
    };
    // Tendu à plat puis posé sur le front : rien n'est validé avant d'être resté debout.
    expect(
      run([
        ['up', 0],
        ['upright', 100],
        ['down', 200],
      ]),
    ).toEqual([]);
    expect(
      run([
        ['upright', 0],
        ['upright', ARM_MS],
        ['down', ARM_MS + 50],
        ['down', ARM_MS + 100],
        ['between', ARM_MS + 150],
        ['up', ARM_MS + 200],
        ['upright', ARM_MS + 300],
        ['upright', 2 * ARM_MS + 300],
        ['up', 2 * ARM_MS + 350],
      ]),
    ).toEqual(['down', 'up']);
  });
});

describe('sons des gestes', () => {
  it('trouvé et passer ont chacun leur son, même à la dernière manche', () => {
    expect(answerSound(true, true, 3, REWARDS, true)).toBe('star');
    expect(answerSound(false, true, 3, REWARDS, true)).toBe('pass');
    expect(answerSound(false, false, 3, REWARDS, true)).toBe('pass');
    expect(answerSound(true, false, 10, REWARDS, true)).toBe('reward');
    expect(passNotes).not.toEqual(starNotes);
    expect(UI_SOUNDS.pass.gain).toBeGreaterThan(UI_SOUNDS.skip.gain);
  });
});

describe('Devine-tête', () => {
  it('jouable sans capteur, avec les boutons, et un son pour chaque réponse', async () => {
    noSensor();
    const user = userEvent.setup();
    open();
    expect(screen.getByRole('heading', { name: 'Devine-tête' })).toBeInTheDocument();
    const intro = screen.getByRole('region', { name: 'Comment on joue' });
    expect(intro).toHaveTextContent('sur son front');
    expect(intro).toHaveTextContent('ne sent pas l’inclinaison');
    await user.click(within(intro).getByRole('button', { name: 'C’est parti' }));

    const word = screen.getByRole('region', { name: 'Mot à faire deviner' });
    const answers = game.items.map((i) => i.answer);
    expect(answers.some((a) => word.textContent!.includes(a))).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    await waitFor(() => expect(played()).toEqual(firstStarNotes));
    await user.click(screen.getByRole('button', { name: 'Passer' }));
    expect(screen.getByText('Manche 3 sur 10')).toBeInTheDocument();
    await waitFor(() => expect(played()).toEqual([...firstStarNotes, ...passNotes]));
  });

  it('demande l’autorisation seulement après l’explication, d’un appui du parent', async () => {
    const sensor = fakeSensor('granted');
    const user = userEvent.setup();
    open();
    const intro = screen.getByRole('region', { name: 'Comment on joue' });
    expect(intro).toHaveTextContent('rien n’est enregistré ni envoyé');
    expect(intro).toHaveTextContent('demander l’autorisation');
    expect(sensor.requestPermission).not.toHaveBeenCalled();

    await user.click(within(intro).getByRole('button', { name: 'Jouer en penchant la tête' }));
    expect(sensor.requestPermission).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Pose le téléphone sur ton front/)).toBeInTheDocument();

    // Debout sur le front, puis la tête vers le bas : trouvé, avec le son de l'étoile.
    sensor.tilt(0, 88);
    sensor.tilt(0, 86, ARM_MS);
    expect(screen.getByText(/Tête vers le bas : trouvé/)).toBeInTheDocument();
    sensor.tilt(180, 30);
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    await waitFor(() => expect(played()).toEqual(firstStarNotes));

    // Rester penché ne compte qu'une fois ; revenir debout, puis vers le haut : passer.
    sensor.tilt(180, 20);
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    sensor.tilt(0, 88);
    sensor.tilt(0, 88, ARM_MS);
    sensor.tilt(0, 20);
    expect(screen.getByText('Manche 3 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    await waitFor(() => expect(played()).toEqual([...firstStarNotes, ...passNotes]));

    // Les boutons restent là.
    await userEvent.setup().click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText('Manche 4 sur 10')).toBeInTheDocument();
  });

  it('autorisation refusée : on joue avec les boutons', async () => {
    const sensor = fakeSensor('denied');
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole('button', { name: 'Jouer en penchant la tête' }));
    expect(sensor.requestPermission).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Sans l’inclinaison, on joue avec les boutons/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'C’est parti' }));
    expect(screen.getByRole('button', { name: 'Trouvé' })).toBeInTheDocument();
  });

  it('prévient quand les sons sont coupés', async () => {
    await setSetting('sounds', false);
    open();
    expect(screen.getByRole('note')).toHaveTextContent('Les sons sont coupés');
  });
});
