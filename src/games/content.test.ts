import { DRAW_THEMES, getPack, MAX_FULL_SECONDS, MELODY_THEMES } from '../content/packs';
import { extractLength, melodySeconds, noteFreq, parseMelody, schedule } from './chanson/melody';
import { EXTRACT_SECONDS, SONGS } from './chanson/songs';
import { DRAW_WORDS } from './dessin/words';
import { cleanItem } from '../data/customGames';
import { CATALOGUE, findCatalogueGame } from './catalogue/catalogue';
import { clock, dayLabel, starsLabel } from './format';
import {
  ALL_GLYPHS,
  CURSIVE,
  DICE,
  DIGITS,
  FINGERS,
  glyphLabel,
  glyphName,
  glyphPool,
  LETTERS,
  LOWERCASE,
  NUMBERS,
} from './lettres/bank';
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
  it('minuscules, attaché, nombres et constellations : chaque glyphe a sa consigne (#48)', () => {
    expect(LOWERCASE.map((c) => c.glyph).join('')).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(CURSIVE.map((c) => c.glyph).join('')).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(NUMBERS.map((c) => Number(c.glyph))).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 40, 50, 60, 70, 80, 90, 100,
    ]);
    expect(DICE.map((c) => c.glyph).join(' ')).toBe('1 2 3 4 5 6');
    expect(FINGERS.map((c) => c.glyph).join(' ')).toBe('1 2 3 4 5 6 7 8 9 10');
    expect(new Set(ALL_GLYPHS.map((c) => c.id)).size).toBe(ALL_GLYPHS.length);
    for (const c of ALL_GLYPHS) expect(c.hint.length).toBeGreaterThan(10);
    // Le choix montré est tiré de la même famille.
    for (const c of ALL_GLYPHS) expect(glyphPool(c).every((o) => o.set === c.set)).toBe(true);
    expect(glyphName(LOWERCASE[0])).toBe('la lettre a (minuscule)');
    expect(glyphLabel(DICE[0])).toBe('1 point');
    expect(glyphLabel(FINGERS[2])).toBe('3 doigts');
  });
  it('a assez de mots et de chansons pour une partie', () => {
    expect(new Set(DRAW_WORDS).size).toBe(DRAW_WORDS.length);
    expect(DRAW_WORDS.length).toBeGreaterThanOrEqual(DEFAULT_ROUNDS * 3);
    expect(SONGS.length).toBeGreaterThanOrEqual(DEFAULT_ROUNDS);
    expect(new Set(SONGS.map((s) => s.id)).size).toBe(SONGS.length);
  });
  it('a 150 mots à dessiner, chacun avec un thème et un niveau (#54)', () => {
    const items = getPack('dessin').items;
    expect(items).toHaveLength(150);
    const key = (answer: string) => answer.toLowerCase().replace(/^(un|une|le|la|les) /, '');
    expect(new Set(items.map((i) => key(i.answer))).size).toBe(items.length);
    for (const item of items)
      expect(
        item.tags?.filter((t) => (DRAW_THEMES as readonly string[]).includes(t)),
        item.answer,
      ).toHaveLength(1);
    for (const theme of DRAW_THEMES)
      expect(items.filter((i) => i.tags?.includes(theme)).length).toBeGreaterThanOrEqual(15);
    // Une partie entière à chaque niveau.
    for (const level of [1, 2, 3])
      expect(items.filter((i) => i.level === level).length).toBeGreaterThanOrEqual(
        DEFAULT_ROUNDS * 3,
      );
  });
  it('les Petits dessinent des formes simples, les scènes sont pour les Grands (#54)', () => {
    const items = getPack('dessin').items;
    const scene = / (qui|avec|sur|dans|plein|sous) /;
    for (const item of items.filter((i) => i.level === 1)) {
      expect(item.answer, item.answer).not.toMatch(scene);
      expect(item.answer.split(' ').length, item.answer).toBeLessThanOrEqual(4);
    }
    const scenes = items.filter((i) => scene.test(i.answer));
    expect(scenes.length).toBeGreaterThanOrEqual(10);
    for (const item of scenes) expect(item.level, item.answer).toBe(3);
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
  it('a au moins 40 airs, chacun avec sa source et son thème (#45)', () => {
    const items = getPack('chansons').items;
    expect(items.length).toBeGreaterThanOrEqual(40);
    for (const item of items) {
      expect(item.source, item.answer).toMatch(/domaine public/);
      expect(
        item.tags?.filter((t) => (MELODY_THEMES as readonly string[]).includes(t)),
      ).toHaveLength(1);
    }
    for (const theme of MELODY_THEMES)
      expect(items.filter((i) => i.tags?.includes(theme)).length).toBeGreaterThanOrEqual(5);
  });
  it('a une partie entière d’airs à chaque niveau', () => {
    for (const level of [1, 2, 3])
      expect(SONGS.filter((s) => s.level === level).length).toBeGreaterThanOrEqual(DEFAULT_ROUNDS);
  });
  it.each(SONGS.map((s) => [s.title, s] as const))(
    '« %s » est une mélodie chantable : notes lisibles, du do3 au do6',
    (_, s) => {
      const notes = parseMelody(s.melody);
      const sounding = notes.filter((n) => n.freq !== null).map((n) => n.freq!);
      expect(sounding.length).toBeGreaterThanOrEqual(8);
      expect(Math.min(...sounding)).toBeGreaterThanOrEqual(noteFreq('C3') - 0.01);
      expect(Math.max(...sounding)).toBeLessThanOrEqual(noteFreq('C6') + 0.01);
      for (const n of notes) expect(n.beats).toBeLessThanOrEqual(8);
    },
  );
  it.each(SONGS.map((s) => [s.title, s] as const))(
    '« %s » se joue en entier pour « Chanter ensemble » (#117), sans coupure',
    (_, s) => {
      const notes = parseMelody(s.melody);
      const full = schedule(notes, s.bpm, Infinity);
      // Toutes les notes, chacune entière : rien n'est coupé à la durée de l'extrait.
      expect(full).toHaveLength(notes.filter((n) => n.freq !== null).length);
      const seconds = melodySeconds(notes, s.bpm);
      expect(extractLength(full)).toBeLessThanOrEqual(seconds + 1e-9);
      expect(seconds).toBeLessThanOrEqual(MAX_FULL_SECONDS);
      expect(seconds).toBeGreaterThanOrEqual(
        extractLength(schedule(notes, s.bpm, EXTRACT_SECONDS)) - 1e-9,
      );
    },
  );
  describe('paroles (#117)', () => {
    const sung = SONGS.filter((s) => s.lyrics);
    /** Syllabes d'un vers, à peu près : les groupes de voyelles. */
    const syllables = (line: string) =>
      line.toLowerCase().match(/[aeiouyàâäéèêëîïôöùûüœ]+/g)?.length ?? 0;

    it('« Une souris verte » et une dizaine d’airs ont leurs paroles', () => {
      expect(sung.map((s) => s.id)).toContain('une-souris-verte');
      expect(sung.length).toBeGreaterThanOrEqual(10);
    });
    it.each(sung.map((s) => [s.title, s] as const))(
      '« %s » : paroles du domaine public, et l’air complet couvre tout le couplet',
      (_, s) => {
        const item = getPack('chansons').items.find((i) => i.id === s.id)!;
        expect(item.source).toMatch(/paroles/);
        expect(item.source).toMatch(/domaine public/);
        // Une note par syllabe, à peu près : l'air noté va jusqu'au bout des paroles.
        const notes = parseMelody(s.melody).filter((n) => n.freq !== null).length;
        const words = s.lyrics!.reduce((sum, line) => sum + syllables(line), 0);
        expect(notes / words).toBeGreaterThanOrEqual(0.85);
        expect(notes / words).toBeLessThanOrEqual(1.2);
      },
    );
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
  it('a 25 jeux avec assez de cartes et des réponses uniques', () => {
    expect(CATALOGUE.map((g) => g.id)).toEqual([
      'animal',
      'couleur',
      'mime',
      'devinette',
      'emotion',
      'emotion-mime',
      'tresor',
      'vrai-faux',
      'jacques',
      'rime',
      'contraire',
      'ombre',
      'intrus',
      'disparu',
      'compte',
      'devine-tete',
      'syllabes',
      'tri',
      'devine-mains',
      'suite',
      'ordre',
      'situation',
      'ni-oui-ni-non',
      'heure',
      'marche',
    ]);
    for (const g of CATALOGUE) {
      expect(g.items.length).toBeGreaterThanOrEqual(DEFAULT_ROUNDS);
      expect(new Set(g.items.map((i) => i.answer)).size).toBe(g.items.length);
      if (g.kind === 'question' || g.kind === 'sound')
        for (const item of g.items) expect(() => cleanItem(g.kind, item)).not.toThrow();
    }
  });
  it('a de quoi jouer plusieurs parties sans revoir une carte (#55)', () => {
    const count = (id: string) => findCatalogueGame(id)!.items.length;
    expect(count('animal')).toBeGreaterThanOrEqual(40);
    expect(count('mime')).toBeGreaterThanOrEqual(40);
    expect(count('devinette')).toBeGreaterThanOrEqual(50);
    // Couleurs : des nuances pour les grands.
    const colors = findCatalogueGame('couleur')!.items;
    expect(colors.filter((c) => c.level === 3).length).toBeGreaterThanOrEqual(10);
    expect(new Set(colors.map((c) => c.color)).size).toBe(colors.length);
  });
  it('montre une image pour chaque carte image et un bruit pour chaque cri', () => {
    for (const g of CATALOGUE.filter((c) => c.kind === 'image'))
      for (const i of g.items) expect(i.color ?? i.emoji ?? i.steps ?? i.text).toBeTruthy();
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
