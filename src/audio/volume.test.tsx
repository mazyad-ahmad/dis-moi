import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';
import { getSettings, loadSettings, setSetting } from '../data/settings';
import { MelodyPlayer } from '../games/chanson/player';
import { DeckGame } from '../games/deck/DeckGame';
import { customDeck } from '../data/customGames';
import {
  contexts,
  decoded,
  elementPlayable,
  FakeAudioElement,
  FakeBuffer,
  FakeContext,
  FakeGain,
  FakeShaper,
  objectUrls,
  pathToSpeaker,
  resetFakeAudio,
  stubMediaElement,
} from '../test/fakeAudio';
import {
  audioBusy,
  CEILING,
  ceilingCurve,
  FADE_IN,
  releaseAudioContext,
  resetAudioForTests,
  VOLUME_GAIN,
} from './context';
import {
  checkFileLevel,
  MAX_BOOST,
  measureLevel,
  normalizeGain,
  TARGET_PEAK,
  TARGET_RMS,
} from './level';
import { playRecording, UNMEASURED_GAIN } from './recording';
import { playSound, UI_SOUNDS, type UiSound } from './sounds';

const RATE = 8000;

/** Sinusoïde de 1 s à l'amplitude donnée, suivie éventuellement d'un silence. */
function sine(amplitude: number, silence = 0) {
  const data = new Float32Array(RATE * (1 + silence));
  for (let i = 0; i < RATE; i++) data[i] = amplitude * Math.sin((2 * Math.PI * 440 * i) / RATE);
  return data;
}

/** Enregistrement simulé : un Blob que le faux décodeur reconnaît. */
function recording(name: string, amplitude: number) {
  decoded.set(name, new FakeBuffer([sine(amplitude)], RATE));
  return new Blob([name]);
}

const ctx = () => contexts[0];

/** Gain atteint à la fin de la montée douce d'une enveloppe. */
const target = (g: FakeGain) => g.gain.ramps[1][0];

/** Durée de la montée douce (au calcul flottant près). */
const fade = (g: FakeGain) => g.gain.ramps[1][1] - g.gain.ramps[0][1] + 1e-9;

beforeEach(async () => {
  resetFakeAudio();
  resetAudioForTests();
  vi.stubGlobal('AudioContext', FakeContext);
  stubMediaElement();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('plafond', () => {
  it('aucune amplitude ne dépasse le plafond, quelle que soit l’entrée', () => {
    const curve = ceilingCurve();
    expect(Math.max(...curve.map(Math.abs))).toBeLessThanOrEqual(CEILING);
    // Les sons normaux passent sans être touchés, la courbe ne fait que monter.
    expect(curve[Math.round(((0.3 + 1) / 2) * (curve.length - 1))]).toBeCloseTo(0.3, 2);
    curve.forEach((v, i) => i && expect(v).toBeGreaterThanOrEqual(curve[i - 1]));
  });

  it('tout son passe par le plafond puis le volume de l’appli, doux par défaut', async () => {
    expect(getSettings().volume).toBe('soft');
    await playSound('star');
    const c = ctx();
    const path = pathToSpeaker(c, c.oscillators[0]);
    expect(path.at(-1)).toBe(c.destination);
    const shaper = path.find((n) => n instanceof FakeShaper)!;
    expect(shaper.curve).toEqual(ceilingCurve());
    const volume = path[path.length - 2] as FakeGain;
    expect(path.indexOf(volume)).toBeGreaterThan(path.indexOf(shaper));
    expect(volume.gain.value).toBe(VOLUME_GAIN.soft);

    await setSetting('volume', 'normal');
    await playSound('skip');
    expect(volume.gain.value).toBe(VOLUME_GAIN.normal);
    expect(VOLUME_GAIN.soft).toBeLessThan(VOLUME_GAIN.normal);
    expect(VOLUME_GAIN.normal).toBeLessThanOrEqual(1);
  });
});

describe('montée douce', () => {
  it('chaque son d’interface part de zéro et monte en douceur', async () => {
    for (const name of Object.keys(UI_SOUNDS) as UiSound[]) await playSound(name);
    const envelopes = ctx().oscillators.map((o) => o.outputs[0] as FakeGain);
    expect(envelopes.length).toBeGreaterThan(0);
    for (const env of envelopes) {
      expect(env.gain.ramps[0][0]).toBeLessThan(0.001);
      expect(fade(env)).toBeGreaterThanOrEqual(FADE_IN);
    }
  });

  it('chaque note de mélodie aussi', async () => {
    const player = new MelodyPlayer([{ freq: 262, start: 0, duration: 0.5 }], 0.5);
    await player.play();
    const env = ctx().oscillators[0].outputs[0] as FakeGain;
    expect(env.gain.ramps[0][0]).toBe(0);
    expect(fade(env)).toBeGreaterThanOrEqual(FADE_IN);
    await player.stop();
  });
});

describe('niveau', () => {
  it('mesure les passages sonores, sans compter les silences', () => {
    const plain = measureLevel([sine(0.5)], RATE);
    expect(plain.peak).toBeCloseTo(0.5, 2);
    expect(plain.rms).toBeCloseTo(0.5 / Math.SQRT2, 2);
    expect(measureLevel([sine(0.5, 2)], RATE).rms).toBeCloseTo(plain.rms, 3);
    expect(measureLevel([new Float32Array(RATE)], RATE)).toEqual({ rms: 0, peak: 0 });
  });

  it('ramène un son fort ou faible au même niveau, sans trop amplifier', () => {
    for (const amplitude of [1, 0.6, 0.2]) {
      const level = measureLevel([sine(amplitude)], RATE);
      const gain = normalizeGain(level);
      expect(level.rms * gain).toBeCloseTo(TARGET_RMS, 3);
      expect(level.peak * gain).toBeLessThanOrEqual(TARGET_PEAK);
    }
    expect(normalizeGain(measureLevel([sine(0.01)], RATE))).toBe(MAX_BOOST);
    expect(normalizeGain({ rms: 0, peak: 0 })).toBe(1);
  });

  it('contrôle des fichiers audio : au niveau commun, ou ce qu’il faut corriger', () => {
    const ok = measureLevel([sine(TARGET_RMS * Math.SQRT2)], RATE);
    expect(checkFileLevel(ok)).toBeNull();
    expect(checkFileLevel(measureLevel([sine(1)], RATE))).toMatch(/crête trop forte/);
    expect(checkFileLevel(measureLevel([sine(0.5)], RATE))).toMatch(/gain de -/);
    expect(checkFileLevel(measureLevel([sine(0.02)], RATE))).toMatch(/gain de \d/);
    expect(checkFileLevel({ rms: 0, peak: 0 })).toBe('fichier muet');
  });
});

describe('enregistrements du parent', () => {
  it('un enregistrement très fort est rejoué au niveau normal', async () => {
    const loud = await playRecording(recording('fort', 1));
    const normal = await playRecording(recording('moyen', 0.2));
    expect(loud && normal).toBeTruthy();
    const [a, b] = ctx().sources;
    const gainA = target(a.outputs[0] as FakeGain);
    const gainB = target(b.outputs[0] as FakeGain);
    // Même niveau efficace à la sortie, crête sous le plafond.
    expect((1 / Math.SQRT2) * gainA).toBeCloseTo(TARGET_RMS, 2);
    expect((0.2 / Math.SQRT2) * gainB).toBeCloseTo(TARGET_RMS, 2);
    expect(gainA).toBeLessThanOrEqual(TARGET_PEAK);
    // … par la sortie commune (plafond puis volume).
    const path = pathToSpeaker(ctx(), a);
    expect(path.some((n) => n instanceof FakeShaper)).toBe(true);
    expect(path.at(-1)).toBe(ctx().destination);
    // Le second a arrêté le premier.
    expect(a.stopped).toBe(true);
    normal!.stop();
  });

  it('démarre en douceur, compte comme un son en cours, se termine', async () => {
    const playback = await playRecording(recording('chat', 0.5));
    const source = ctx().sources[0];
    const env = source.outputs[0] as FakeGain;
    expect(env.gain.ramps[0][0]).toBe(0);
    expect(fade(env)).toBeGreaterThanOrEqual(FADE_IN);
    expect(source.started).toBe(true);
    expect(audioBusy()).toBe(true);
    // Une félicitation ne s'arrête pas à cause d'elle-même.
    expect(audioBusy(playback!.playing)).toBe(false);
    // Pendant l'écoute, pas de son d'interface par-dessus.
    await playSound('star');
    expect(ctx().oscillators).toHaveLength(0);
    source.end();
    await playback!.ended;
    expect(playback!.playing()).toBe(false);
    expect(audioBusy()).toBe(false);
  });

  it('fichier illisible ou pas de Web Audio : rien n’est joué, sans erreur', async () => {
    await expect(playRecording(new Blob(['inconnu']))).resolves.toBeNull();
    resetAudioForTests();
    vi.stubGlobal('AudioContext', undefined);
    await expect(playRecording(recording('chien', 0.5))).resolves.toBeNull();
  });

  it('dans un jeu créé : « Écouter le son » le joue au niveau commun', async () => {
    const user = userEvent.setup();
    render(
      <DeckGame
        deck={{
          id: 'perso-1',
          name: 'Quel bruit ?',
          category: 'Son',
          kind: 'sound',
          tint: 'dawn',
          mark: 'QB',
          items: [{ answer: 'Le chat', audio: recording('miaou', 1) }],
        }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Écouter le son' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    await waitFor(() => expect(ctx().sources).toHaveLength(1));
    const source = ctx().sources[0];
    expect(target(source.outputs[0] as FakeGain)).toBeLessThan(0.2);
    act(() => source.end());
    expect(await screen.findByRole('button', { name: 'Écouter le son' })).toBeInTheDocument();
  });
});

describe('son d’une carte créée sur Android (#141)', () => {
  /** Enregistrement que Web Audio ne sait pas décoder mais que l'élément <audio> lit. */
  function phoneRecording(name: string) {
    elementPlayable.add(name);
    return new Blob([name], { type: 'audio/webm;codecs=opus' });
  }

  it('décodage refusé : lu par un élément <audio>, par la sortie commune', async () => {
    const playback = await playRecording(phoneRecording('vroum'));
    expect(playback).not.toBeNull();
    const [el] = FakeAudioElement.created;
    expect(el.paused).toBe(false);
    // Branché sur la sortie commune (plafond puis volume), au gain d'un son mis à niveau.
    const [node] = ctx().mediaSources;
    expect(node.element).toBe(el);
    const env = node.outputs[0] as FakeGain;
    expect(target(env)).toBe(UNMEASURED_GAIN);
    expect(UNMEASURED_GAIN).toBe(TARGET_PEAK);
    expect(fade(env)).toBeGreaterThanOrEqual(FADE_IN);
    const path = pathToSpeaker(ctx(), node);
    expect(path.some((n) => n instanceof FakeShaper)).toBe(true);
    expect(path.at(-1)).toBe(ctx().destination);
    expect(audioBusy()).toBe(true);
    // L'URL du son reste valide pendant toute la lecture, libérée à la fin.
    expect(objectUrls.size).toBe(1);
    el.end();
    await playback!.ended;
    expect(objectUrls.size).toBe(0);
    expect(audioBusy()).toBe(false);
  });

  it('un échec passager n’empêche pas la lecture suivante', async () => {
    const audio = new Blob(['tut']);
    await expect(playRecording(audio)).resolves.toBeNull();
    decoded.set('tut', new FakeBuffer([sine(0.3)], RATE));
    await expect(playRecording(audio)).resolves.not.toBeNull();
    expect(ctx().sources).toHaveLength(1);
  });

  it('après le micro, le son repart d’un contexte neuf', async () => {
    await playRecording(recording('avant', 0.5));
    releaseAudioContext();
    expect(contexts[0].state).toBe('closed');
    await playRecording(recording('après', 0.5));
    expect(contexts).toHaveLength(2);
    expect(contexts[1].sources[0].started).toBe(true);
  });

  it('jeu créé : le son de chaque manche est joué', async () => {
    const user = userEvent.setup();
    const game = {
      id: 7,
      name: 'Bruits de la maison',
      kind: 'sound' as const,
      createdAt: 0,
      updatedAt: 0,
      items: [
        { answer: 'La voiture', audio: phoneRecording('vroum') },
        { answer: 'Le chat', audio: recording('miaou', 0.5) },
      ],
    };
    render(<DeckGame deck={customDeck(game)} />);
    for (let round = 0; round < 2; round++) {
      await user.click(await screen.findByRole('button', { name: 'Écouter le son' }));
      await waitFor(() => expect(audioBusy()).toBe(true));
      await user.click(screen.getByRole('button', { name: 'Pause' }));
      expect(audioBusy()).toBe(false);
      await user.click(screen.getByRole('button', { name: /Trouvé/ }));
    }
    // Un son de chaque sorte : décodé par Web Audio, et lu par l'élément <audio>.
    expect(contexts.flatMap((c) => c.sources.filter((s) => s.started))).toHaveLength(1);
    expect(FakeAudioElement.created).toHaveLength(1);
  });

  it('son illisible : le parent voit un message et peut réessayer', async () => {
    const user = userEvent.setup();
    render(
      <DeckGame
        deck={{
          id: 'perso-2',
          name: 'Quel bruit ?',
          category: 'Son',
          kind: 'sound',
          tint: 'dawn',
          mark: 'QB',
          items: [{ answer: 'Le chien', audio: new Blob(['abîmé']) }],
        }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Écouter le son' }));
    expect(await screen.findByText(/Le son ne s’est pas lancé/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Écouter le son' })).toBeEnabled();
  });
});

it('espace Parent : volume de l’appli doux par défaut, ou normal', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/parent/sons';
  render(<App />);
  expect(screen.getByRole('radio', { name: 'Doux' })).toBeChecked();
  await user.click(screen.getByRole('radio', { name: 'Normal' }));
  await waitFor(async () => expect((await db.settings.get('volume'))?.value).toBe('normal'));
});
