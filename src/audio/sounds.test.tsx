import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';
import { loadSettings, setSetting } from '../data/settings';
import { REWARDS } from '../data/history';
import { MelodyPlayer } from '../games/chanson/player';
import { audioBusy, registerAudioSource, resetAudioForTests } from './context';
import { answerSound, playSound, UI_SOUNDS, type UiSound } from './sounds';
import { contexts, FakeContext, played, resetFakeAudio } from '../test/fakeAudio';

beforeEach(async () => {
  resetFakeAudio();
  resetAudioForTests();
  vi.stubGlobal('AudioContext', FakeContext);
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});
afterEach(() => vi.unstubAllGlobals());

describe('bibliothèque de sons', () => {
  it('aucun son ne descend : rien de négatif, même pour « Passer »', () => {
    for (const name of Object.keys(UI_SOUNDS) as UiSound[]) {
      const freqs = UI_SOUNDS[name].tones.map((t) => t.freq);
      freqs.forEach((f, i) => i && expect(f).toBeGreaterThanOrEqual(freqs[i - 1]));
    }
    expect(UI_SOUNDS.skip.tones).toHaveLength(1);
    expect(UI_SOUNDS.skip.gain).toBeLessThan(UI_SOUNDS.star.gain);
  });

  it('joue les notes du son sur un seul contexte partagé', async () => {
    await playSound('star');
    await playSound('skip');
    expect(contexts).toHaveLength(1);
    expect(played()).toEqual([
      ...UI_SOUNDS.star.tones.map((t) => t.freq),
      ...UI_SOUNDS.skip.tones.map((t) => t.freq),
    ]);
  });

  it('réglage coupé : aucun son', async () => {
    await setSetting('sounds', false);
    await playSound('star');
    await playSound('end');
    expect(played()).toEqual([]);
  });

  it('ne couvre jamais un son en cours de lecture', async () => {
    let busy = true;
    const release = registerAudioSource(() => busy);
    await playSound('star');
    expect(played()).toEqual([]);
    busy = false;
    await playSound('star');
    expect(played()).toHaveLength(3);
    release();
  });

  it('relance le son suspendu (téléphone verrouillé puis réveillé)', async () => {
    await playSound('skip');
    const ctx = contexts[0];
    ctx.state = 'suspended';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(ctx.state).toBe('running');
    ctx.state = 'suspended';
    await playSound('skip');
    expect(ctx.state).toBe('running');
    expect(ctx.oscillators).toHaveLength(2);
  });

  it('sans Web Audio, ne fait rien et ne lève pas d’erreur', async () => {
    vi.stubGlobal('AudioContext', undefined);
    await expect(playSound('star')).resolves.toBeUndefined();
  });

  it('choisit le son après une réponse', () => {
    expect(answerSound(true, false, 3, REWARDS)).toBe('star');
    expect(answerSound(false, false, 3, REWARDS)).toBe('skip');
    expect(answerSound(false, true, 3, REWARDS)).toBe('end');
    expect(answerSound(true, true, 3, REWARDS)).toBe('end');
    expect(answerSound(true, false, 10, REWARDS)).toBe('reward');
    expect(answerSound(false, false, 10, REWARDS)).toBe('skip');
    expect(answerSound(true, false, null, REWARDS)).toBe('star');
  });
});

describe('mélodie', () => {
  it('partage le contexte et bloque les sons d’interface pendant la lecture', async () => {
    const player = new MelodyPlayer(
      [
        { freq: 262, start: 0, duration: 0.5 },
        { freq: 294, start: 0.5, duration: 0.5 },
      ],
      1,
    );
    await player.play();
    expect(audioBusy()).toBe(true);
    await playSound('star');
    expect(played()).toEqual([262, 294]);

    // Pause à 0,6 s : la reprise repart de la note suivante, sur le même contexte.
    contexts[0].currentTime = 0.65;
    await player.pause();
    expect(player.elapsed).toBeCloseTo(0.6);
    expect(audioBusy()).toBe(false);
    await player.play();
    await player.stop();
    expect(contexts).toHaveLength(1);
    expect(player.elapsed).toBe(0);
  });
});

describe('dans un jeu', () => {
  function open(path: string) {
    window.location.hash = `#${path}`;
    return render(<App />);
  }

  it('« Trouvé » joue l’étoile, « Passer » le son neutre', async () => {
    const user = userEvent.setup();
    open('/jeu/lettres');
    // Laisse la base répondre (étoiles des autres parties).
    await act(() => Promise.resolve());
    await user.click(screen.getByRole('button', { name: 'Passer' }));
    await waitFor(() => expect(played()).toEqual(UI_SOUNDS.skip.tones.map((t) => t.freq)));
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    // Première étoile gagnée ensemble : c'est une récompense.
    await waitFor(() => expect(played()).toHaveLength(1 + UI_SOUNDS.reward.tones.length));
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    await waitFor(() =>
      expect(played().slice(-3)).toEqual(UI_SOUNDS.star.tones.map((t) => t.freq)),
    );
  });

  it('Dessine ça : une clochette à la fin du minuteur', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      open('/jeu/dessin');
      act(() => void vi.advanceTimersByTime(59_000));
      expect(played()).toEqual([]);
      act(() => void vi.advanceTimersByTime(1_000));
      await act(() => Promise.resolve());
      expect(played()).toEqual(UI_SOUNDS.timer.tones.map((t) => t.freq));
    } finally {
      vi.useRealTimers();
    }
  });

  it('réglage coupé dans l’espace Parent : aucun son en jeu', async () => {
    const user = userEvent.setup();
    const view = open('/parent');
    expect(screen.getByRole('radio', { name: 'Activés' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Désactivés' }));
    await waitFor(async () => expect((await db.settings.get('sounds'))?.value).toBe(false));
    view.unmount();

    open('/jeu/lettres');
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    await user.click(screen.getByRole('button', { name: 'Passer' }));
    expect(screen.getByText('Manche 3 sur 10')).toBeInTheDocument();
    expect(played()).toEqual([]);
  });
});
