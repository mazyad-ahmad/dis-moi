import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { resetAudioForTests } from '../../audio/context';
import { TARGET_PEAK } from '../../audio/level';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import {
  contexts,
  decoded,
  FakeBuffer,
  FakeContext,
  FakeGain,
  FakeShaper,
  pathToSpeaker,
  resetFakeAudio,
  stubMediaElement,
} from '../../test/fakeAudio';
import { DAILY_SOURCES } from '../defi/daily';
import { grandGames } from '../grand/pool';
import { LEVELS } from '../levels';
import { suitsMode } from '../modes';
import { findGame, GAMES } from '../registry';
import {
  ECHO_FEEDBACK,
  ECHO_TAIL,
  EFFECT_RATE,
  EFFECTS,
  effectGain,
  ROBOT_HZ,
  worstPeak,
} from './effects';
import { challengeAt, PHRASES, surpriseEffect, VOICE_MAX_SECONDS, VOIX_ID } from './voix';

const RATE = 8000;
const CLIP = 'phrase-enregistree';

/** Micro simulé : chaque enregistrement donne le Blob CLIP, que le faux décodeur reconnaît. */
class FakeRecorder {
  static isTypeSupported = () => true;
  static last: FakeRecorder | null = null;
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(readonly stream: { getTracks: () => { stop: () => void }[] }) {
    FakeRecorder.last = this;
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob([CLIP], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

const track = { stop: vi.fn() };
const getUserMedia = vi.fn();

function sine(amplitude: number) {
  const data = new Float32Array(RATE);
  for (let i = 0; i < RATE; i++) data[i] = amplitude * Math.sin((2 * Math.PI * 300 * i) / RATE);
  return data;
}

beforeEach(async () => {
  resetFakeAudio();
  resetAudioForTests();
  vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  stubMediaElement();
  track.stop.mockClear();
  getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [track] });
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
  });
  decoded.set(CLIP, new FakeBuffer([sine(0.9)], RATE));
  sessionStorage.clear();
  localStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
  await setSetting('rounds', 3);
});

afterEach(() => {
  delete (navigator as { mediaDevices?: unknown }).mediaDevices;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete document.documentElement.dataset.theme;
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const lastContext = () => contexts.at(-1)!;

describe('Voix rigolotes : règles', () => {
  it('des phrases sur les trois niveaux, chacune avec une image', () => {
    expect(PHRASES.length).toBeGreaterThanOrEqual(30);
    for (const { value } of LEVELS)
      expect(PHRASES.filter((p) => p.level === value).length).toBeGreaterThanOrEqual(10);
    for (const p of PHRASES) expect(p.emoji).toBeTruthy();
  });

  it('alterne « Devine la voix » et « Devine ma phrase »', () => {
    expect([1, 2, 3, 4].map(challengeAt)).toEqual(['voix', 'phrase', 'voix', 'phrase']);
    expect(surpriseEffect(() => 0)).toBe('robot');
    expect(surpriseEffect(() => 0.999)).toBe('echo');
    expect(EFFECTS.map((e) => e.id).sort()).toEqual(['echo', 'geant', 'robot', 'souris']);
  });

  it('aucun effet ne dépasse le niveau commun (volume limité)', () => {
    for (const e of EFFECTS) expect(worstPeak(e.id, TARGET_PEAK)).toBeLessThanOrEqual(TARGET_PEAK);
    expect(effectGain('echo')).toBeCloseTo(1 - ECHO_FEEDBACK);
    expect(ECHO_FEEDBACK).toBeLessThan(1);
    expect(ECHO_TAIL).toBeLessThan(3);
    expect(EFFECT_RATE.souris).toBeGreaterThan(1);
    expect(EFFECT_RATE.geant).toBeLessThan(1);
  });

  it('jeu de base, au coucher mais pas en voiture, ni dans le Grand Jeu ni dans le défi', () => {
    const game = findGame(VOIX_ID)!;
    expect(game.name).toBe('Voix rigolotes');
    expect(game.levels).toEqual([1, 2, 3]);
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
    expect(suitsMode(game.needs, 'voiture')).toBe(false);
    expect(grandGames(GAMES, []).map((g) => g.id)).not.toContain(VOIX_ID);
    expect(DAILY_SOURCES.map((s) => s.game)).not.toContain(VOIX_ID);
  });
});

describe('une partie avec le micro', () => {
  it('enregistre, rejoue déformé par la sortie commune, puis oublie le son à la manche suivante', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0.3); // voix surprise : la souris
    open(`/jeu/${VOIX_ID}`);
    expect(await screen.findByText('Manche 1 sur 3')).toBeInTheDocument();
    expect(screen.getByText('Devine la voix')).toBeInTheDocument();
    // Rien n'est demandé au micro avant l'appui.
    expect(getUserMedia).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Enregistrer la phrase' }));
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(await screen.findByText(new RegExp(`${VOICE_MAX_SECONDS} s maximum`))).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Arrêter' }));
    expect(track.stop).toHaveBeenCalled();

    await user.click(await screen.findByRole('button', { name: 'Écouter la voix surprise' }));
    await waitFor(() => expect(lastContext().sources).toHaveLength(1));
    const c = lastContext();
    const source = c.sources[0];
    expect(source.started).toBe(true);
    expect(source.playbackRate.value).toBe(EFFECT_RATE.souris);
    // Plafond puis volume de l'appli, jusqu'au haut-parleur.
    const path = pathToSpeaker(c, source);
    expect(path.at(-1)).toBe(c.destination);
    expect(path.some((n) => n instanceof FakeShaper)).toBe(true);
    // Ramené au niveau commun : la crête ne dépasse pas celle d'un son mis à niveau.
    const env = source.outputs[0] as FakeGain;
    expect(env.gain.ramps[0][0]).toBe(0);
    expect(env.gain.ramps[1][0] * 0.9).toBeLessThanOrEqual(TARGET_PEAK + 1e-6);

    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    expect(parent).toHaveTextContent('s’efface à la fin de la manche');
    await user.click(within(parent).getByRole('button', { name: 'Voir la voix' }));
    expect(parent).toHaveTextContent('La voix de souris !');
    expect(screen.getByRole('group', { name: 'Réécouter avec une autre voix' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(await screen.findByText('Manche 2 sur 3')).toBeInTheDocument();
    // Manche suivante : la voix s'arrête, l'enregistrement est oublié.
    expect(source.stopped).toBe(true);
    expect(screen.queryByRole('button', { name: /Réenregistrer|Écouter/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer la phrase' })).toBeVisible();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    // Jamais écrit nulle part : ni la partie enregistrée, ni l'onglet.
    await waitFor(async () => expect(await db.games.count()).toBe(1));
    const saved = JSON.stringify(await db.games.toArray());
    expect(saved).not.toContain(CLIP);
    expect(JSON.stringify({ ...sessionStorage, ...localStorage })).not.toContain(CLIP);
  });

  it('« Devine ma phrase » : la phrase se cache, l’enfant choisit la voix', async () => {
    const user = userEvent.setup();
    open(`/jeu/${VOIX_ID}`);
    await user.click(await screen.findByRole('button', { name: 'Pas encore' }));
    expect(await screen.findByText('Manche 2 sur 3')).toBeInTheDocument();
    expect(screen.getByText(/Devine ma phrase/)).toBeInTheDocument();
    const phrase = screen.getByRole('region', { name: 'Phrase' }).textContent!;

    await user.click(screen.getByRole('button', { name: 'Enregistrer la phrase' }));
    await user.click(await screen.findByRole('button', { name: 'Arrêter' }));
    expect(await screen.findByText('La phrase est cachée')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Phrase' }).textContent).not.toBe(phrase);

    const voices = screen.getByRole('group', { name: 'Choisis une voix' });
    await user.click(within(voices).getByRole('button', { name: /Écho/ }));
    await waitFor(() => expect(lastContext().delays).toHaveLength(1));
    const c = lastContext();
    expect(c.delays[0].outputs[0]).toBeInstanceOf(FakeGain);
    expect((c.delays[0].outputs[0] as FakeGain).gain.value).toBe(ECHO_FEEDBACK);
    expect(pathToSpeaker(c, c.sources[0]).at(-1)).toBe(c.destination);
    expect(within(voices).getByRole('button', { name: /Écho/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(within(voices).getByRole('button', { name: /Robot/ }));
    await waitFor(() => expect(lastContext().oscillators.length).toBeGreaterThan(0));
    expect(lastContext().oscillators.at(-1)!.frequency.value).toBe(ROBOT_HZ);
    // Une seule voix à la fois.
    expect(lastContext().sources[0].stopped).toBe(true);
  });

  it('quitter pendant l’enregistrement coupe le micro', async () => {
    const user = userEvent.setup();
    const view = open(`/jeu/${VOIX_ID}`);
    await user.click(await screen.findByRole('button', { name: 'Enregistrer la phrase' }));
    await screen.findByRole('button', { name: 'Arrêter' });
    view.unmount();
    expect(track.stop).toHaveBeenCalled();
  });
});

describe('sans micro', () => {
  it('micro refusé : on peut jouer en faisant les voix soi-même', async () => {
    const user = userEvent.setup();
    getUserMedia.mockRejectedValue(new DOMException('refusé', 'NotAllowedError'));
    open(`/jeu/${VOIX_ID}`);
    await user.click(await screen.findByRole('button', { name: 'Enregistrer la phrase' }));
    expect(await screen.findByText(/Le micro n’est pas autorisé/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Jouer sans micro' }));
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    expect(parent).toHaveTextContent('Sans micro');
    await user.click(within(parent).getByRole('button', { name: 'Voir la voix à imiter' }));
    expect(parent).toHaveTextContent(/Robot|Souris|Géant|Écho/);
    // Le choix tient pour la partie.
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(await screen.findByRole('group', { name: 'Choisis une voix à imiter' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Enregistrer la phrase' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jouer avec le micro' })).toBeVisible();
  });

  it('appareil sans micro : le jeu se joue sans rien enregistrer', async () => {
    vi.stubGlobal('MediaRecorder', undefined);
    open(`/jeu/${VOIX_ID}`);
    expect(await screen.findByText('Manche 1 sur 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer la phrase' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Jouer avec le micro' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Pour le parent' })).toHaveTextContent('Sans micro');
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
