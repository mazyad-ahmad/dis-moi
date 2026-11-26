import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { resetVoiceForTests } from '../../voice/speech';
import { CURSIVE, DIGITS, LETTERS, LOWERCASE } from './bank';
import { LetterSoundBlock } from './LetterSound';
import { LETTER_SOUNDS, letterSoundOf, soundQuestions, spokenWords } from './sons';

// #50 : le son des lettres, avant leur nom.

/** Mot sans accent, en minuscules. */
const plain = (word: string) => word.toLocaleLowerCase('fr').normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Débuts de mot qui ne font pas le son de leur lettre : un piège pour un petit qui écoute.
 * (« ch » de chat sous C, « ce » de cerise, « gi » de girafe, « ou » d'ours sous O, nasales…)
 */
const TRAPS: Record<string, RegExp> = {
  A: /^(an[^aeiouy]|am[^aeiouy]|ai|au)/,
  C: /^(ch|ce|ci|cy)/,
  E: /^e/,
  G: /^(ge|gi|gy|gn)/,
  I: /^(in[^aeiouy]|im[^aeiouy])/,
  O: /^(ou|oi|on[^aeiouy]|om[^aeiouy])/,
  P: /^ph/,
  S: /^(ch|sh)/,
  T: /^th/,
  U: /^(un[^aeiouy]|um[^aeiouy])/,
};

describe('contenu', () => {
  it('les 26 lettres ont leur son et au moins trois mots illustrés', () => {
    expect(LETTER_SOUNDS.map((s) => s.letter).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    for (const s of LETTER_SOUNDS) {
      expect(s.sound.trim()).not.toBe('');
      expect(s.words.length).toBeGreaterThanOrEqual(3);
      for (const x of s.words) {
        expect(x.word.trim()).not.toBe('');
        expect(x.emoji.trim()).not.toBe('');
      }
      expect(new Set(s.words.map((x) => x.word)).size).toBe(s.words.length);
    }
  });

  it('chaque mot commence par sa lettre, sans début piège', () => {
    for (const s of LETTER_SOUNDS)
      for (const { word } of s.words) {
        const p = plain(word);
        expect(p[0], word).toBe(s.letter.toLowerCase());
        expect(TRAPS[s.letter]?.test(word.toLocaleLowerCase('fr')) ?? false, word).toBe(false);
      }
  });

  it('pas de « h » muet piège : un H seulement sous la lettre H', () => {
    for (const s of LETTER_SOUNDS) {
      if (s.letter === 'H') continue;
      for (const x of [...s.words, ...(s.intrus ? [s.intrus] : [])])
        expect(plain(x.word).startsWith('h'), x.word).toBe(false);
    }
    const h = LETTER_SOUNDS.find((s) => s.letter === 'H')!;
    expect(h.silent).toBe(true);
    expect(h.note).toMatch(/ne s’entend pas/);
  });

  it('le E se dit « é » : tous ses mots commencent par « é »', () => {
    const e = LETTER_SOUNDS.find((s) => s.letter === 'E')!;
    expect(e.sound).toBe('é');
    for (const { word } of e.words) expect(word.startsWith('é'), word).toBe(true);
  });

  it('l’intrus commence par une autre lettre', () => {
    for (const s of LETTER_SOUNDS)
      if (s.intrus) expect(plain(s.intrus.word)[0], s.intrus.word).not.toBe(plain(s.letter));
  });

  it('le mot de la consigne commence par le bon son', () => {
    for (const card of LETTERS) {
      const word = card.hint.split(' : ').at(-1)!;
      expect(plain(word)[0], word).toBe(card.glyph.toLowerCase());
      expect(TRAPS[card.glyph]?.test(word) ?? false, word).toBe(false);
    }
    expect(LETTERS.find((c) => c.glyph === 'C')!.hint).not.toMatch(/cheval/);
  });

  it('suit les majuscules, minuscules et l’attaché, pas les chiffres', () => {
    expect(letterSoundOf(LETTERS[12])?.sound).toBe('mmm');
    expect(letterSoundOf(LOWERCASE[12])?.letter).toBe('M');
    expect(letterSoundOf(CURSIVE[12])?.letter).toBe('M');
    expect(letterSoundOf(DIGITS[3])).toBeUndefined();
  });

  it('pas de comparaison de son pour le H, qu’on n’entend pas', () => {
    const h = LETTER_SOUNDS.find((s) => s.letter === 'H')!;
    expect(soundQuestions(h)).toEqual(['find']);
    const m = LETTER_SOUNDS.find((s) => s.letter === 'M')!;
    expect(soundQuestions(m)).toEqual(['find', 'like']);
    expect(spokenWords(m)).toBe('maison… moto… mouton');
  });
});

const M = LETTER_SOUNDS.find((s) => s.letter === 'M')!;

class FakeUtterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  volume = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

function phoneVoice() {
  const spoken: string[] = [];
  const v = { lang: 'fr-FR', localService: true, name: 'fr', voiceURI: 'fr', default: true };
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => [v],
    speak: (u: FakeUtterance) => spoken.push(u.text),
    cancel: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return spoken;
}

describe('dans « Pour le parent »', () => {
  beforeEach(async () => {
    resetVoiceForTests();
    await Promise.all([db.settings.clear(), db.games.clear()]);
    await loadSettings();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetVoiceForTests();
  });

  it('montre le son, les trois mots et une question à poser', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<LetterSoundBlock sound={M} />);
    expect(screen.getByText(/Le son :/).parentElement).toHaveTextContent(
      'Le son : « mmm », comme au début de maison',
    );
    const words = screen.getByRole('list', { name: 'Mots du son' });
    expect(
      within(words)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['🏠maison', '🏍️moto', '🐑mouton']);
    expect(screen.getByText(/Trouve un mot qui commence par “mmm”/)).toBeInTheDocument();
  });

  it('ou « Qu’est-ce qui commence comme maison ? », avec un intrus', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    render(<LetterSoundBlock sound={M} />);
    expect(screen.getByText(/Qu’est-ce qui commence comme/)).toHaveTextContent(
      'Qu’est-ce qui commence comme maison : 🍓 fraise ou 🏍️ moto ? » (réponse : moto)',
    );
  });

  it('sans voix du téléphone : tout est écrit, pas de bouton « Écouter »', async () => {
    window.location.hash = '#/jeu/lettres';
    render(<App />);
    const parent = await screen.findByRole('region', { name: 'Pour le parent' });
    expect(within(parent).getByText(/Le son :/)).toBeInTheDocument();
    expect(within(parent).getByRole('list', { name: 'Mots du son' })).toBeInTheDocument();
    expect(within(parent).getByText(/^Demande :/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Écouter les mots' })).not.toBeInTheDocument();
  });

  it('avec la voix du téléphone : « Écouter les mots » dit les trois mots', async () => {
    const user = userEvent.setup();
    const spoken = phoneVoice();
    await setSetting('readAloud', 'normal');
    render(<LetterSoundBlock sound={M} />);
    await user.click(screen.getByRole('button', { name: 'Écouter les mots' }));
    expect(spoken).toEqual(['maison… moto… mouton']);
  });

  it('le H : pas de son à écouter, une question sur l’écrit', () => {
    phoneVoice();
    render(<LetterSoundBlock sound={LETTER_SOUNDS.find((s) => s.letter === 'H')!} />);
    expect(screen.getByText(/ne s’entend pas/)).toBeInTheDocument();
    expect(screen.getByText(/s’écrit avec un H au début/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Écouter les mots' })).not.toBeInTheDocument();
  });

  it('pas de son pour un chiffre', async () => {
    window.location.hash = '#/jeu/lettres';
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByLabelText('Chiffres'));
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    expect(within(parent).queryByText(/Le son :/)).not.toBeInTheDocument();
  });
});
