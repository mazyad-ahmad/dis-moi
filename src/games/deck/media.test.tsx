import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAudioForTests } from '../../audio/context';
import { db } from '../../data/db';
import { loadSettings } from '../../data/settings';
import { contexts, decoded, FakeBuffer, FakeContext, resetFakeAudio } from '../../test/fakeAudio';
import { DeckGame } from './DeckGame';
import type { Deck, DeckItem } from './types';
import { FOUND_PHOTO_MS } from './useFoundPhoto';

/** Vrais cris et photos des jeux intégrés (#118). */

const RATE = 8000;
const cri = (name: string) => `/media/${name}.wav`;
const tone = () =>
  new FakeBuffer([Float32Array.from({ length: RATE }, (_, i) => 0.3 * Math.sin(i / 3))], RATE);

function deck(items: DeckItem[]): Deck {
  return {
    id: 'animal',
    name: 'Quel animal ?',
    category: 'Animaux',
    kind: 'sound',
    tint: 'meadow',
    mark: 'Cri',
    items,
  };
}

const vache: DeckItem = {
  answer: 'La vache',
  emoji: '🐄',
  text: 'Meuh !',
  soundUrl: cri('meuh'),
  photoUrl: '/media/vache.webp',
};
const chat: DeckItem = {
  answer: 'Le chat',
  emoji: '🐈',
  text: 'Miaou !',
  soundUrl: cri('miaou'),
  photoUrl: '/media/chat.webp',
};

beforeEach(async () => {
  resetFakeAudio();
  resetAudioForTests();
  vi.stubGlobal('AudioContext', FakeContext);
  // Les fichiers embarqués sont lus par fetch (servis par le cache du service worker).
  vi.stubGlobal('fetch', async (url: string) => {
    const name = /\/media\/(\w+)\.wav$/.exec(url)?.[1];
    return { ok: !!name, blob: async () => new Blob([name ?? '']) };
  });
  decoded.set('meuh', tone());
  decoded.set('miaou', tone());
  await Promise.all([db.settings.clear(), db.games.clear()]);
  await loadSettings();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const photo = () => screen.queryByRole('img', { name: /^Photo/ });

it('« Écouter le cri » joue le vrai son, en plus de l’imitation, et s’arrête à la manche suivante', async () => {
  const user = userEvent.setup();
  render(<DeckGame deck={deck([vache, chat])} />);
  // L'imitation par le parent reste la façon de jouer par défaut.
  expect(screen.getByText('Le parent fait le bruit, l’enfant devine')).toBeInTheDocument();
  expect(screen.getByText(/À imiter/)).toBeInTheDocument();

  const listen = await screen.findByRole('button', { name: 'Écouter le cri' });
  await waitFor(() => expect(listen).toBeEnabled());
  await user.click(listen);
  expect(screen.getByRole('button', { name: 'Arrêter le cri' })).toBeInTheDocument();
  await waitFor(() => expect(contexts[0].sources).toHaveLength(1));
  const source = contexts[0].sources[0];
  expect(source.stopped).toBe(false);

  await user.click(screen.getByRole('button', { name: 'Passer' }));
  expect(source.stopped).toBe(true);
  expect(await screen.findByRole('button', { name: 'Écouter le cri' })).toBeInTheDocument();
});

it('la photo n’apparaît qu’après « Voir la réponse »', async () => {
  const user = userEvent.setup();
  render(<DeckGame deck={deck([vache])} />);
  expect(photo()).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
  const img = screen.getByRole('img', { name: 'Photo : la vache' });
  expect(img).toHaveAttribute('src', '/media/vache.webp');
});

it('après « Trouvé », la photo de l’animal s’affiche quelques secondes', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<DeckGame deck={deck([vache, chat])} />);
  const first = screen.getByText(/À imiter/).textContent!.includes('Meuh') ? vache : chat;
  expect(photo()).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  // Manche suivante déjà là, la photo de la carte trouvée par-dessus.
  expect(screen.getByText(/Manche 2/)).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: `${first.answer} ! Toucher pour fermer la photo` }),
  ).toBeInTheDocument();
  act(() => void vi.advanceTimersByTime(FOUND_PHOTO_MS));
  expect(screen.queryByRole('button', { name: /fermer la photo/ })).toBeNull();

  // Un appui la ferme plus tôt ; « Passer » ne la montre pas.
  await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  await user.click(screen.getByRole('button', { name: /fermer la photo/ }));
  expect(screen.queryByRole('button', { name: /fermer la photo/ })).toBeNull();
});

it('une carte sans fichier garde le fonctionnement d’avant', async () => {
  const user = userEvent.setup();
  render(<DeckGame deck={deck([{ answer: 'Le loup', emoji: '🐺', text: 'Aouuuuh !' }])} />);
  expect(screen.getByText(/À imiter/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Écouter le cri' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
  expect(screen.getByText('🐺 Le loup')).toBeInTheDocument();
  expect(photo()).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  expect(screen.queryByRole('button', { name: /fermer la photo/ })).toBeNull();
});
