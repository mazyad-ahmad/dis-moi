import { extractLength, noteFreq, parseMelody, schedule } from './chanson/melody';
import { EXTRACT_SECONDS, SONGS } from './chanson/songs';
import { DRAW_WORDS } from './dessin/words';
import { cleanItem } from '../data/customGames';
import { CATALOGUE, findCatalogueGame } from './catalogue/catalogue';
import { clock, dayLabel, starsLabel } from './format';
import { DIGITS, LETTERS } from './lettres/bank';
import { draw, shuffle } from './shuffle';
import { DEFAULT_ROUNDS } from './useRounds';

describe('tirage', () => {
  it('mélange sans perdre ni dupliquer', () => {
    const items = Array.from({ length: 30 }, (_, i) => i);
    const out = shuffle(items);
    expect([...out].sort((a, b) => a - b)).toEqual(items);
    expect(items[0]).toBe(0); // l'original n'est pas modifié
  });
  it('tire sans répétition', () => {
    const out = draw(LETTERS, 10);
    expect(new Set(out.map((c) => c.glyph)).size).toBe(10);
    expect(draw([1, 2], 10)).toHaveLength(2);
  });
});

describe('banques de questions', () => {
  it('couvre tout l’alphabet et les chiffres 0-9', () => {
    expect(LETTERS.map((c) => c.glyph).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(DIGITS.map((c) => c.glyph).join('')).toBe('0123456789');
    for (const c of [...LETTERS, ...DIGITS]) expect(c.hint.length).toBeGreaterThan(10);
  });
  it('a assez de mots et de chansons pour une partie', () => {
    expect(new Set(DRAW_WORDS).size).toBe(DRAW_WORDS.length);
    expect(DRAW_WORDS.length).toBeGreaterThanOrEqual(DEFAULT_ROUNDS * 3);
    expect(SONGS.length).toBeGreaterThanOrEqual(DEFAULT_ROUNDS);
    expect(new Set(SONGS.map((s) => s.id)).size).toBe(SONGS.length);
  });
});

describe('mélodies', () => {
  it('calcule les fréquences', () => {
    expect(noteFreq('A4')).toBe(440);
    expect(noteFreq('C4')).toBeCloseTo(261.63, 1);
    expect(noteFreq('F#4')).toBeCloseTo(369.99, 1);
    expect(noteFreq('Bb3')).toBeCloseTo(233.08, 1);
    expect(() => noteFreq('H4')).toThrow();
  });
  it('lit la notation et place les notes dans le temps', () => {
    const notes = parseMelody('C4 R:.5 | E4:2');
    expect(notes.map((n) => n.beats)).toEqual([1, 0.5, 2]);
    expect(notes[1].freq).toBeNull();
    const events = schedule(notes, 120, 10);
    expect(events.map((e) => [e.start, e.duration])).toEqual([
      [0, 0.5],
      [0.75, 1],
    ]);
    expect(extractLength(events)).toBe(1.75);
  });
  it('coupe l’extrait à la durée maximale', () => {
    const events = schedule(parseMelody('C4:30'), 60, 10);
    expect(extractLength(events)).toBe(10);
  });
  it.each(SONGS.map((s) => [s.title, s] as const))(
    '« %s » donne un extrait de 6 à 10 s',
    (_, s) => {
      const length = extractLength(schedule(parseMelody(s.melody), s.bpm, EXTRACT_SECONDS));
      expect(length).toBeGreaterThanOrEqual(6);
      expect(length).toBeLessThanOrEqual(EXTRACT_SECONDS);
    },
  );
});

it('formate les étoiles et le minuteur', () => {
  expect(starsLabel(0)).toBe('0 étoile');
  expect(starsLabel(1)).toBe('1 étoile');
  expect(starsLabel(7)).toBe('7 étoiles');
  expect(clock(60)).toBe('1:00');
  expect(clock(42)).toBe('0:42');
  expect(clock(-3)).toBe('0:00');
});

describe('catalogue', () => {
  it('a 7 jeux avec assez de cartes et des réponses uniques', () => {
    expect(CATALOGUE.map((g) => g.id)).toEqual([
      'animal',
      'couleur',
      'mime',
      'devinette',
      'emotion',
      'emotion-mime',
      'tresor',
    ]);
    for (const g of CATALOGUE) {
      expect(g.items.length).toBeGreaterThanOrEqual(DEFAULT_ROUNDS);
      expect(new Set(g.items.map((i) => i.answer)).size).toBe(g.items.length);
      if (g.kind === 'question' || g.kind === 'sound')
        for (const item of g.items) expect(() => cleanItem(g.kind, item)).not.toThrow();
    }
  });
  it('montre une image pour chaque carte image et un bruit pour chaque cri', () => {
    for (const g of CATALOGUE.filter((c) => c.kind === 'image'))
      for (const i of g.items) expect(i.color ?? i.emoji).toBeTruthy();
    for (const i of findCatalogueGame('animal')!.items) expect(i.text).toBeTruthy();
    for (const i of findCatalogueGame('couleur')!.items) expect(i.color).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('dates', () => {
  it('écrit le jour de la partie', () => {
    const now = new Date(2026, 10, 25, 18).getTime();
    expect(dayLabel(new Date(2026, 10, 25, 8).getTime(), now)).toBe('aujourd’hui');
    expect(dayLabel(new Date(2026, 10, 24, 23).getTime(), now)).toBe('hier');
    expect(dayLabel(new Date(2026, 10, 20, 10).getTime(), now)).toBe('vendredi 20 novembre');
  });
});
