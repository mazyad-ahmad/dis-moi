import { extractLength, noteFreq, parseMelody, schedule } from './melody';
import { EXTRACT_SECONDS, SLOW_TEMPO, SONGS } from './songs';
import {
  FAST_TEMPO,
  firstNotes,
  isVariantChoice,
  randomVariant,
  VARIANT_IDS,
  VARIANTS,
  variantSchedule,
} from './variants';

const notes = parseMelody('C4 D4 R:.5 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5');

describe('Variantes de Quelle chanson ? (#47)', () => {
  it('s’expliquent chacune en une phrase', () => {
    for (const id of VARIANT_IDS) {
      const { explain, label } = VARIANTS[id];
      expect(label).toBeTruthy();
      expect(explain).toMatch(/^[^.!?]+[.!?]$/);
    }
  });

  it('l’extrait : exactement le planning habituel', () => {
    expect(variantSchedule(notes, 120)).toEqual(schedule(notes, 120, EXTRACT_SECONDS));
  });

  it('petit à petit : 3 notes, puis 5, puis 10, puis l’extrait', () => {
    const counts = [0, 1, 2, 3].map((s) => variantSchedule(notes, 120, 'petit-a-petit', s).length);
    expect(counts).toEqual([3, 5, 10, 12]);
    // Le silence entre deux notes est gardé.
    expect(firstNotes(notes, 3)).toHaveLength(4);
    expect(variantSchedule(notes, 120, 'petit-a-petit', 0)).toEqual(
      schedule(notes, 120, EXTRACT_SECONDS).slice(0, 3),
    );
  });

  it('au ralenti et en accéléré : mêmes notes, tempo changé', () => {
    const base = variantSchedule(notes, 120);
    const slow = variantSchedule(notes, 120, 'ralenti');
    const fast = variantSchedule(notes, 120, 'accelere');
    expect(slow.map((e) => e.freq)).toEqual(base.map((e) => e.freq));
    expect(fast.map((e) => e.freq)).toEqual(base.map((e) => e.freq));
    expect(extractLength(slow)).toBeCloseTo(extractLength(base) / SLOW_TEMPO);
    expect(extractLength(fast)).toBeCloseTo(extractLength(base) / FAST_TEMPO);
    // L'indice « air ralenti » ralentit encore.
    expect(extractLength(variantSchedule(notes, 120, 'accelere', 0, true))).toBeCloseTo(
      extractLength(base) / (FAST_TEMPO * SLOW_TEMPO),
    );
  });

  it('le rythme seul : toutes les notes à la hauteur de la tonique, même rythme', () => {
    const base = variantSchedule(notes, 120);
    const rhythm = variantSchedule(notes, 120, 'rythme');
    expect(new Set(rhythm.map((e) => e.freq))).toEqual(new Set([noteFreq('G5')]));
    expect(rhythm.map((e) => [e.start, e.duration])).toEqual(
      base.map((e) => [e.start, e.duration]),
    );
  });

  it('chaque air donne quelque chose à écouter dans chaque variante', () => {
    for (const song of SONGS)
      for (const v of VARIANT_IDS)
        expect(
          variantSchedule(parseMelody(song.melody), song.bpm, v).length,
          song.title,
        ).toBeGreaterThan(2);
  });

  it('tire une variante, reconnaît un choix sauvegardé', () => {
    expect(VARIANT_IDS).toContain(randomVariant());
    expect(isVariantChoice('hasard')).toBe(true);
    expect(isVariantChoice('rythme')).toBe(true);
    expect(isVariantChoice('toString')).toBe(false);
    expect(isVariantChoice(3)).toBe(false);
  });
});
