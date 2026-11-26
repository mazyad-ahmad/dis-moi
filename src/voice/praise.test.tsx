import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { playRecording, type RecordingPlayback } from '../audio/recording';
import { registerAudioSource, resetAudioForTests } from '../audio/context';
import { db } from '../data/db';
import { addPraise, MAX_PRAISES } from '../data/praises';
import { loadSettings, setSetting } from '../data/settings';
import { cancelPraise, endPhrase, pickOther, praise, PRAISES } from './praise';
import { resetVoiceForTests } from './speech';

// Le contexte audio n'existe pas dans jsdom : on simule la lecture des sons enregistrés.
vi.mock('../audio/recording', () => {
  const playRecording = vi.fn<(audio: Blob) => Promise<RecordingPlayback>>(async () => ({
    stop: vi.fn(),
    playing: () => true,
    ended: new Promise<void>(() => {}),
  }));
  return {
    playRecording,
    // Bouton d'écoute de l'espace Parent : joue par la même fonction.
    useRecording: (audio: Blob) => ({ playing: false, toggle: () => void playRecording(audio) }),
  };
});

class FakeUtterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

const LOCAL_FR = {
  lang: 'fr-FR',
  localService: true,
  name: 'Français',
  voiceURI: 'fr',
  default: true,
} as SpeechSynthesisVoice;

/** Synthèse vocale simulée : jsdom n'en a pas. */
function fakeSynth(voices: SpeechSynthesisVoice[] = [LOCAL_FR]) {
  const target = new EventTarget();
  const synth = {
    spoken: [] as string[],
    pending: [] as FakeUtterance[],
    getVoices: () => voices,
    speak(u: FakeUtterance) {
      synth.spoken.push(u.text);
      synth.pending.push(u);
    },
    cancel() {
      const stopped = synth.pending;
      synth.pending = [];
      stopped.forEach((u) => u.onerror?.());
    },
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return synth;
}

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const pause = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));
const praised = (spoken: string[]) =>
  spoken.filter((t) => (PRAISES as readonly string[]).includes(t));

beforeEach(async () => {
  resetVoiceForTests();
  resetAudioForTests();
  vi.mocked(playRecording).mockClear();
  await Promise.all([db.settings.clear(), db.games.clear(), db.praises.clear()]);
  await loadSettings();
  // Sans son d'interface, la félicitation part tout de suite.
  await setSetting('sounds', false);
});

afterEach(() => {
  cancelPraise();
  vi.unstubAllGlobals();
  resetVoiceForTests();
  resetAudioForTests();
});

describe('phrases', () => {
  it('fête toujours la fin de partie, même sans étoile', () => {
    expect(endPhrase(7)).toBe('Vous avez gagné 7 étoiles ensemble !');
    expect(endPhrase(1)).toBe('Vous avez gagné une étoile ensemble !');
    expect(endPhrase(0)).toBe('Bravo d’avoir joué ensemble !');
  });

  it('ne redit pas deux fois de suite la même félicitation', () => {
    for (let i = 0; i < 20; i++) expect(pickOther(PRAISES, 'Bravo !')).not.toBe('Bravo !');
    expect(pickOther(['Seule'], 'Seule')).toBe('Seule');
  });
});

describe('en partie', () => {
  it('dit « Bravo ! » au Trouvé, rien sur Passer', async () => {
    const user = userEvent.setup();
    const synth = fakeSynth();
    open('/jeu/lettres');
    await user.click(screen.getByRole('button', { name: 'Passer' }));
    await pause(50);
    expect(synth.spoken).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    // La manche suivante est déjà là, la félicitation ne la retarde pas.
    expect(screen.getByText('Manche 3 sur 10')).toBeInTheDocument();
    await waitFor(() => expect(praised(synth.spoken)).toHaveLength(1));
  });

  it('attend la fin du son d’interface', async () => {
    const user = userEvent.setup();
    await setSetting('sounds', true);
    const synth = fakeSynth();
    open('/jeu/lettres');
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    await pause(200);
    expect(synth.spoken).toEqual([]);
    // Première étoile : c'est le son « récompense », un peu plus long.
    await waitFor(() => expect(praised(synth.spoken)).toHaveLength(1), { timeout: 3000 });
  });

  it('se tait quand le réglage est coupé', async () => {
    const user = userEvent.setup();
    await setSetting('praise', false);
    const synth = fakeSynth();
    open('/jeu/lettres');
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    await pause(50);
    expect(synth.spoken).toEqual([]);
  });

  it('annonce les étoiles gagnées ensemble en fin de partie', async () => {
    const user = userEvent.setup();
    await setSetting('rounds', 5);
    const synth = fakeSynth();
    open('/jeu/lettres');
    for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    await user.click(screen.getByRole('button', { name: 'Passer' }));
    expect(await screen.findByText('4 étoiles gagnées ensemble !')).toBeInTheDocument();
    await waitFor(() => expect(synth.spoken.at(-1)).toBe('Vous avez gagné 4 étoiles ensemble !'));
  });

  it('se coupe quand on quitte la partie', async () => {
    const user = userEvent.setup();
    const synth = fakeSynth();
    open('/jeu/lettres');
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    await waitFor(() => expect(synth.pending).toHaveLength(1));
    await user.click(screen.getByRole('link', { name: 'Quitter la partie' }));
    expect(await screen.findByRole('heading', { name: 'On joue à quoi ?' })).toBeInTheDocument();
    expect(synth.pending).toEqual([]);
  });
});

describe('sons en cours', () => {
  it('ne couvre pas une mélodie ou un son déjà en cours', async () => {
    const synth = fakeSynth();
    const release = registerAudioSource(() => true);
    praise();
    await pause(50);
    expect(synth.spoken).toEqual([]);
    release();
  });

  it('s’arrête si une mélodie démarre pendant la félicitation', async () => {
    const synth = fakeSynth();
    let melody = false;
    registerAudioSource(() => melody);
    praise();
    await waitFor(() => expect(synth.pending).toHaveLength(1));
    melody = true;
    await waitFor(() => expect(synth.pending).toEqual([]));
  });

  it('une nouvelle félicitation remplace celle qui n’est pas encore partie', async () => {
    const synth = fakeSynth();
    praise({ afterMs: 100 });
    praise({ stars: 3, afterMs: 0 });
    await pause(150);
    expect(synth.spoken).toEqual(['Vous avez gagné 3 étoiles ensemble !']);
  });
});

describe('félicitations du parent', () => {
  it('remplacent la voix du téléphone, par le contexte audio partagé', async () => {
    const synth = fakeSynth();
    const audio = new Blob(['bravo'], { type: 'audio/webm' });
    await addPraise(audio);
    praise();
    await waitFor(() => expect(playRecording).toHaveBeenCalledTimes(1));
    expect(synth.spoken).toEqual([]);
  });

  it('marchent aussi sans voix française locale', async () => {
    await addPraise(new Blob(['bravo']));
    praise({ stars: 2 });
    await waitFor(() => expect(playRecording).toHaveBeenCalledTimes(1));
  });

  it('sont limitées en nombre', async () => {
    for (let i = 0; i < MAX_PRAISES; i++)
      expect(await addPraise(new Blob([`${i}`]))).not.toBeNull();
    expect(await addPraise(new Blob(['de trop']))).toBeNull();
    expect(await db.praises.count()).toBe(MAX_PRAISES);
  });
});

describe('espace Parent', () => {
  it('ne propose rien sans voix française locale ni enregistrement', async () => {
    open('/parent');
    expect(await screen.findByText(/félicitations parlées ne sont pas proposées/)).toBeVisible();
    expect(screen.queryByRole('radio', { name: 'Activées' })).not.toBeInTheDocument();
  });

  it('propose d’enregistrer quand le micro est là, même sans voix', async () => {
    vi.stubGlobal('MediaRecorder', class {});
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      configurable: true,
    });
    try {
      open('/parent');
      expect(
        await screen.findByRole('button', { name: 'Enregistrer une félicitation' }),
      ).toBeVisible();
      expect(screen.queryByRole('radio', { name: 'Activées' })).not.toBeInTheDocument();
    } finally {
      delete (navigator as { mediaDevices?: unknown }).mediaDevices;
    }
  });

  it('se règle avec une voix locale, indépendamment des sons', async () => {
    const user = userEvent.setup();
    fakeSynth();
    open('/parent');
    const group = await screen.findByRole('group', { name: 'Félicitations parlées' });
    await user.click(within(group).getByLabelText('Désactivées'));
    expect(await db.settings.get('praise')).toEqual({ key: 'praise', value: false });
    expect(await db.settings.get('sounds')).toEqual({ key: 'sounds', value: false });
  });

  it('liste les félicitations enregistrées, et « Tout effacer » les supprime', async () => {
    const user = userEvent.setup();
    await addPraise(new Blob(['bravo']));
    open('/parent');
    const group = await screen.findByRole('group', { name: 'Félicitations parlées' });
    expect(within(group).getByLabelText('Activées')).toBeChecked();
    await user.click(within(group).getByRole('button', { name: 'Écouter Félicitation 1' }));
    expect(playRecording).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Effacer toutes les données' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Tout effacer' }));
    expect(await screen.findByText('Toutes les données ont été effacées.')).toBeInTheDocument();
    expect(await db.praises.count()).toBe(0);
  });
});
