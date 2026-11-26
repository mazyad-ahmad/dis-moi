import { MELODY_GAIN, MelodyPlayer } from '../games/chanson/player';
import { parseMelody, tonic } from '../games/chanson/melody';
import { contexts, FakeContext, type FakeGain, played, resetFakeAudio } from '../test/fakeAudio';
import { CEILING, FADE_IN, resetAudioForTests, runningAudioContext } from './context';
import {
  DRONE_GAIN,
  droneFreq,
  INSTRUMENTS,
  MAX_PARTIAL_HZ,
  peakGain,
  playNote,
  randomTimbre,
  TIMBRES,
} from './instruments';

beforeEach(() => {
  resetFakeAudio();
  resetAudioForTests();
  vi.stubGlobal('AudioContext', FakeContext);
});
afterEach(() => vi.unstubAllGlobals());

const ctx = () => contexts[0];
const envelopes = () => ctx().oscillators.map((o) => o.outputs[0] as FakeGain);

describe('timbres', () => {
  it('quatre instruments : boîte à musique, flûte, piano, xylophone', () => {
    expect(TIMBRES).toEqual(['boite', 'flute', 'piano', 'xylophone']);
  });

  it('doux à plein volume : rien d’agressif, et sous le plafond même avec le bourdon', () => {
    for (const t of TIMBRES) {
      for (const p of INSTRUMENTS[t].partials) expect(['sine', 'triangle']).toContain(p.wave);
      expect(INSTRUMENTS[t].attack).toBeGreaterThanOrEqual(FADE_IN);
      // Bien en dessous du plafond : il n'a jamais à arrondir une note (genou à 0,4).
      expect((peakGain(t) + DRONE_GAIN) * MELODY_GAIN).toBeLessThanOrEqual(CEILING * 0.8);
    }
  });

  it('chaque note part de zéro, monte en douceur et s’éteint', async () => {
    const c = (await runningAudioContext())!;
    for (const t of TIMBRES) playNote(c, c.destination, t, 440, 0, 0.5);
    for (const env of envelopes()) {
      expect(env.gain.ramps[0]).toEqual([0, 0]);
      expect(env.gain.ramps[1][1]).toBeGreaterThanOrEqual(FADE_IN);
      expect(env.gain.ramps.at(-1)![0]).toBeLessThan(0.001);
    }
  });

  it('pas d’harmonique dans l’aigu criard d’un petit haut-parleur', async () => {
    const c = (await runningAudioContext())!;
    for (const t of TIMBRES) playNote(c, c.destination, t, 1000, 0, 0.5);
    expect(played().length).toBeGreaterThan(0);
    for (const f of played()) expect(f).toBeLessThanOrEqual(MAX_PARTIAL_HZ);
  });

  it('tire chaque instrument au hasard', () => {
    expect(TIMBRES.map((_, i) => randomTimbre(() => i / TIMBRES.length))).toEqual(TIMBRES);
    expect(randomTimbre(() => 0.9999)).toBe('xylophone');
  });
});

describe('accompagnement', () => {
  it('bourdon sur la tonique, ramenée dans l’octave grave', () => {
    expect(tonic(parseMelody('C4 D4 G4 R'))).toBeCloseTo(392);
    expect(tonic(parseMelody('R'))).toBeNull();
    expect(droneFreq(392)).toBeCloseTo(196);
    expect(droneFreq(65.4)).toBeCloseTo(130.8);
    expect(droneFreq(220)).toBe(220);
  });

  it('pause et reprise : la mélodie repart de la note suivante, le bourdon aussi', async () => {
    const player = new MelodyPlayer(
      [
        { freq: 262, start: 0, duration: 0.5 },
        { freq: 294, start: 0.5, duration: 0.5 },
        { freq: 330, start: 1, duration: 0.5 },
      ],
      1.5,
      { timbre: 'flute', drone: 262 },
    );
    await player.play();
    // Deux harmoniques par note de flûte, plus le bourdon.
    expect(played()).toHaveLength(3 * 2 + 1);
    expect(played()).toContain(131);
    const drone = ctx().oscillators.at(-1)!;
    expect(drone.type).toBe('triangle');
    expect((drone.outputs[0] as FakeGain).gain.ramps[1][0]).toBe(DRONE_GAIN);

    ctx().currentTime = 0.65;
    await player.pause();
    expect(player.elapsed).toBeCloseTo(0.6);
    const before = played().length;
    await player.play();
    // Seule la dernière note est rejouée, avec son bourdon.
    expect(played().slice(before)).toEqual([330, 660, 131]);
    await player.stop();
    expect(player.elapsed).toBe(0);
  });

  it('sans accompagnement, aucun bourdon', async () => {
    const player = new MelodyPlayer([{ freq: 262, start: 0, duration: 0.5 }], 0.5, {
      timbre: 'xylophone',
    });
    await player.play();
    expect(played()).toEqual([262, 786]);
    await player.stop();
  });
});
