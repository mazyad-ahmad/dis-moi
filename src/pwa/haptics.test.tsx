import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';
import { getSettings, loadSettings, setSetting } from '../data/settings';
import { canVibrate, HAPTICS, vibrate } from './haptics';

const vibrateSpy = vi.fn<(pattern: VibratePattern) => boolean>(() => true);

beforeEach(async () => {
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
  vibrateSpy.mockClear();
  Object.defineProperty(navigator, 'vibrate', {
    value: vibrateSpy,
    configurable: true,
    writable: true,
  });
  window.location.hash = '';
});

afterEach(() => {
  // jsdom n'a pas de vibreur : on revient à cet état.
  delete (navigator as { vibrate?: unknown }).vibrate;
  vi.useRealTimers();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

describe('vibrate', () => {
  it('vibre par défaut', () => {
    expect(getSettings().vibrations).toBe(true);
    vibrate('found');
    expect(vibrateSpy).toHaveBeenCalledWith(HAPTICS.found);
  });

  it('suit le réglage', async () => {
    await setSetting('vibrations', false);
    vibrate('found');
    vibrate('party');
    expect(vibrateSpy).not.toHaveBeenCalled();
  });

  it('sans effet ni erreur sans API', () => {
    delete (navigator as { vibrate?: unknown }).vibrate;
    expect(() => vibrate('party')).not.toThrow();
  });

  it('sans erreur si le navigateur refuse', () => {
    vibrateSpy.mockImplementationOnce(() => {
      throw new Error('refusé');
    });
    expect(() => vibrate('found')).not.toThrow();
  });
});

it('jeu : courte sur « Trouvé », rien sur « Passer », fête à la fin', async () => {
  await setSetting('rounds', 5);
  const user = userEvent.setup();
  open('/jeu/lettres');
  await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  expect(vibrateSpy).toHaveBeenLastCalledWith(HAPTICS.found);
  await user.click(screen.getByRole('button', { name: 'Passer' }));
  expect(vibrateSpy).toHaveBeenCalledTimes(1);
  for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  expect(screen.getByRole('heading', { name: /gagnées ensemble/ })).toBeInTheDocument();
  expect(vibrateSpy).toHaveBeenLastCalledWith([...HAPTICS.party]);
});

it('jeu : aucune vibration quand le réglage est coupé', async () => {
  await setSetting('vibrations', false);
  const user = userEvent.setup();
  open('/jeu/lettres');
  await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  expect(vibrateSpy).not.toHaveBeenCalled();
});

it('Dessine ça : rien pendant le dessin, double vibration à la fin du minuteur', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  open('/jeu/dessin');

  // L'enfant dessine : aucun retour tactile.
  const canvas = document.querySelector('canvas')!;
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
  act(() => void vi.advanceTimersByTime(30_000));
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 40, clientY: 40 });
  fireEvent.pointerUp(canvas, { pointerId: 1 });
  await user.click(screen.getByRole('button', { name: 'Couleur : Noir' }));
  await user.click(screen.getByRole('radio', { name: 'Bleu' }));
  await user.click(screen.getByRole('button', { name: 'Autre mot' }));
  act(() => void vi.advanceTimersByTime(59_000));
  expect(vibrateSpy).not.toHaveBeenCalled();

  act(() => void vi.advanceTimersByTime(1_000));
  expect(screen.getByRole('timer')).toHaveAccessibleName('Temps écoulé');
  expect(vibrateSpy).toHaveBeenCalledTimes(1);
  expect(vibrateSpy).toHaveBeenLastCalledWith([...HAPTICS.timeUp]);

  // Le parent valide le dessin terminé.
  await user.click(screen.getByRole('button', { name: "C'est fini" }));
  expect(vibrateSpy).toHaveBeenLastCalledWith(HAPTICS.found);
  // Nouveau mot : le minuteur repart, plus rien jusqu'à sa fin.
  act(() => void vi.advanceTimersByTime(30_000));
  expect(vibrateSpy).toHaveBeenCalledTimes(2);
});

it('espace Parent : le réglage « Vibrations » est enregistré', async () => {
  const user = userEvent.setup();
  open('/parent');
  const group = screen.getByRole('group', { name: 'Vibrations' });
  expect(group).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Avec' })).toBeChecked();
  await user.click(screen.getByRole('radio', { name: 'Sans' }));
  expect(getSettings().vibrations).toBe(false);
  expect(await db.settings.get('vibrations')).toEqual({ key: 'vibrations', value: false });
});

it('impulsions assez longues pour être senties', () => {
  const pulses = Object.values(HAPTICS).flatMap((p) =>
    typeof p === 'number' ? [p] : p.filter((_, i) => i % 2 === 0),
  );
  for (const ms of pulses) expect(ms).toBeGreaterThanOrEqual(80);
});

it('espace Parent : « Essayer » fait vibrer au toucher, même au premier appui', async () => {
  const user = userEvent.setup();
  open('/parent');
  await user.click(screen.getByRole('button', { name: 'Essayer' }));
  expect(vibrateSpy).toHaveBeenCalledWith(HAPTICS.found);
  expect(screen.getByText(/Rien senti \?/)).toBeInTheDocument();
  // Réglage coupé : plus de bouton d'essai.
  await user.click(screen.getByRole('radio', { name: 'Sans' }));
  expect(screen.queryByRole('button', { name: 'Essayer' })).not.toBeInTheDocument();
});

it('espace Parent : dit quand le navigateur refuse de vibrer', async () => {
  vibrateSpy.mockImplementationOnce(() => false);
  const user = userEvent.setup();
  open('/parent');
  await user.click(screen.getByRole('button', { name: 'Essayer' }));
  expect(screen.getByText(/a refusé de faire vibrer/)).toBeInTheDocument();
});

it('espace Parent : sans vibreur, le dit au lieu de proposer le réglage', () => {
  delete (navigator as { vibrate?: unknown }).vibrate;
  expect(canVibrate()).toBe(false);
  open('/parent');
  expect(screen.queryByRole('group', { name: 'Vibrations' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Vibrations' })).toBeInTheDocument();
  expect(screen.getByText(/ne sait pas faire vibrer/)).toBeInTheDocument();
});
