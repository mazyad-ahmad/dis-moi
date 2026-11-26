import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';
import { setSetting } from '../data/settings';
import { DIGITS, LETTERS } from '../games/lettres/bank';
import { DRAW_WORDS } from '../games/dessin/words';
import { pickFrenchVoice, resetVoiceForTests, speak } from './speech';

function voice(lang: string, localService: boolean, name = lang, isDefault = false) {
  return { lang, localService, name, voiceURI: name, default: isDefault } as SpeechSynthesisVoice;
}

class FakeUtterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

/** Synthèse vocale simulée : jsdom n'en a pas. */
function fakeSynth(voices: SpeechSynthesisVoice[]) {
  const target = new EventTarget();
  const synth = {
    voices,
    spoken: [] as FakeUtterance[],
    pending: [] as FakeUtterance[],
    cancels: 0,
    getVoices: () => synth.voices,
    speak(u: FakeUtterance) {
      synth.spoken.push(u);
      synth.pending.push(u);
    },
    cancel() {
      synth.cancels++;
      const stopped = synth.pending;
      synth.pending = [];
      stopped.forEach((u) => u.onerror?.());
    },
    /** Fin naturelle de la lecture en cours. */
    finish() {
      const u = synth.pending.shift();
      u?.onend?.();
    },
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return synth;
}

const LOCAL_FR = voice('fr-FR', true, 'Français (téléphone)');
const ONLINE_FR = voice('fr-FR', false, 'Français (en ligne)', true);

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

/** Consigne affichée dans « Quelle lettre ? ». */
function currentHint() {
  const glyph = screen.getByTestId('glyph').textContent!;
  return [...LETTERS, ...DIGITS].find((c) => c.glyph === glyph)!.hint;
}

beforeEach(async () => {
  resetVoiceForTests();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await setSetting('readAloud', 'normal');
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetVoiceForTests();
});

describe('choix de la voix', () => {
  it('ne retient qu’une voix française installée sur le téléphone', () => {
    expect(pickFrenchVoice([ONLINE_FR, voice('en-US', true)])).toBeNull();
    expect(pickFrenchVoice([ONLINE_FR, voice('fr-CA', true, 'qc'), LOCAL_FR])).toBe(LOCAL_FR);
    expect(pickFrenchVoice([voice('fr_BE', true, 'be')])?.name).toBe('be');
    expect(pickFrenchVoice([])).toBeNull();
  });

  it('ne lit rien sans voix française locale', () => {
    const synth = fakeSynth([ONLINE_FR]);
    expect(speak('Bonjour')).toBeNull();
    expect(synth.spoken).toEqual([]);
  });

  it('impose la voix locale et la vitesse', () => {
    const synth = fakeSynth([ONLINE_FR, LOCAL_FR]);
    speak('Bonjour', { speed: 'slow' });
    expect(synth.spoken[0]).toMatchObject({ text: 'Bonjour', voice: LOCAL_FR, lang: 'fr-FR' });
    expect(synth.spoken[0].rate).toBeLessThan(1);
  });
});

describe('bouton « Lire »', () => {
  it('n’apparaît pas sans synthèse vocale', () => {
    open('/jeu/lettres');
    expect(screen.queryByRole('button', { name: 'Lire' })).not.toBeInTheDocument();
  });

  it('n’apparaît pas si la voix française demande le réseau', () => {
    fakeSynth([ONLINE_FR, voice('en-GB', true)]);
    open('/jeu/lettres');
    expect(screen.queryByRole('button', { name: 'Lire' })).not.toBeInTheDocument();
  });

  it('apparaît quand le téléphone a fini de charger ses voix', () => {
    const synth = fakeSynth([]);
    open('/jeu/lettres');
    expect(screen.queryByRole('button', { name: 'Lire' })).not.toBeInTheDocument();
    synth.voices = [LOCAL_FR];
    act(() => void synth.dispatchEvent(new Event('voiceschanged')));
    expect(screen.getByRole('button', { name: 'Lire' })).toBeInTheDocument();
  });

  it('lit la consigne et s’arrête au changement de manche', async () => {
    const user = userEvent.setup();
    const synth = fakeSynth([LOCAL_FR]);
    open('/jeu/lettres');
    const hint = currentHint();
    await user.click(screen.getByRole('button', { name: 'Lire' }));
    expect(synth.spoken.at(-1)).toMatchObject({ text: hint, voice: LOCAL_FR, rate: 1 });
    expect(screen.getByRole('button', { name: 'Arrêter la lecture' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(synth.pending).toEqual([]);
    expect(screen.getByRole('button', { name: 'Lire' })).toBeInTheDocument();
  });

  it('s’arrête quand on quitte la partie, et à la demande', async () => {
    const user = userEvent.setup();
    const synth = fakeSynth([LOCAL_FR]);
    open('/jeu/lettres');
    await user.click(screen.getByRole('button', { name: 'Lire' }));
    await user.click(screen.getByRole('button', { name: 'Arrêter la lecture' }));
    expect(synth.pending).toEqual([]);

    // Fin naturelle : le bouton redevient « Lire ».
    await user.click(screen.getByRole('button', { name: 'Lire' }));
    act(() => synth.finish());
    expect(screen.getByRole('button', { name: 'Lire' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lire' }));
    await user.click(screen.getByRole('link', { name: 'Quitter la partie' }));
    expect(await screen.findByRole('heading', { name: 'On joue à quoi ?' })).toBeInTheDocument();
    expect(synth.pending).toEqual([]);
  });

  it('suit la vitesse réglée, ou disparaît si le parent l’a désactivé', async () => {
    const user = userEvent.setup();
    const synth = fakeSynth([LOCAL_FR]);
    await setSetting('readAloud', 'slow');
    const { unmount } = open('/jeu/lettres');
    await user.click(screen.getByRole('button', { name: 'Lire' }));
    expect(synth.spoken.at(-1)!.rate).toBe(0.7);
    unmount();

    await setSetting('readAloud', 'off');
    open('/jeu/lettres');
    expect(screen.queryByRole('button', { name: 'Lire' })).not.toBeInTheDocument();
  });

  it('Dessine ça : lit le mot, s’arrête avec « Autre mot »', async () => {
    const user = userEvent.setup();
    const synth = fakeSynth([LOCAL_FR]);
    open('/jeu/dessin');
    await user.click(screen.getByRole('button', { name: 'Lire' }));
    expect(DRAW_WORDS).toContain(synth.spoken.at(-1)!.text);
    await user.click(screen.getByRole('button', { name: 'Autre mot' }));
    expect(synth.pending).toEqual([]);
  });
});

describe('espace Parent', () => {
  it('propose la vitesse avec une voix locale', async () => {
    const user = userEvent.setup();
    fakeSynth([LOCAL_FR]);
    open('/parent');
    const group = screen.getByRole('group', { name: 'Lecture à voix haute' });
    expect(group).toBeInTheDocument();
    await user.click(screen.getByLabelText('Lente'));
    expect(await db.settings.get('readAloud')).toEqual({ key: 'readAloud', value: 'slow' });
  });

  it('explique l’absence de voix française locale', () => {
    fakeSynth([ONLINE_FR]);
    open('/parent');
    expect(screen.queryByRole('group', { name: 'Lecture à voix haute' })).not.toBeInTheDocument();
    expect(screen.getByText(/Aucune voix française installée/)).toBeInTheDocument();
  });
});
