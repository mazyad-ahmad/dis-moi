import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAudioForTests, sourcePlaying } from '../../audio/context';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { contexts, FakeContext, resetFakeAudio } from '../../test/fakeAudio';
import { SongRound } from './SongGame';
import { EXTRACT_SECONDS, SONGS } from './songs';

const song = (id: string) => SONGS.find((s) => s.id === id)!;

/** Dernier instant programmé par les notes jouées, en secondes. */
const lastScheduled = () =>
  Math.max(0, ...contexts.flatMap((c) => c.gains.flatMap((g) => g.gain.ramps.map((r) => r[1]))));

beforeEach(async () => {
  resetFakeAudio();
  resetAudioForTests();
  vi.stubGlobal('AudioContext', FakeContext);
  await db.settings.clear();
  await loadSettings();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Chanter ensemble (#117)', () => {
  it('après « Voir la réponse » : l’air en entier et les paroles, coupés à la manche suivante', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SongRound key="1" song={song('une-souris-verte')} />);
    // Pas avant la réponse : chanter vient une fois la chanson trouvée.
    expect(screen.queryByRole('button', { name: 'Chanter ensemble' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
    await user.click(screen.getByRole('button', { name: 'Chanter ensemble' }));

    // L'extrait laisse la place à l'air entier, qui joue au-delà des 10 secondes.
    expect(screen.queryByRole('region', { name: 'Extrait' })).not.toBeInTheDocument();
    const sing = screen.getByRole('region', { name: 'Chanter ensemble' });
    await waitFor(() => expect(sourcePlaying()).toBe(true));
    expect(lastScheduled()).toBeGreaterThan(EXTRACT_SECONDS + 3);
    expect(within(sing).getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(within(sing).getByRole('status')).toHaveTextContent(/^Air en entier · 0:00 \/ 0:1\d$/);

    // Les paroles, en grand, reçoivent le focus : TalkBack les lit.
    const lyrics = within(sing).getByRole('region', { name: 'Paroles' });
    expect(lyrics).toHaveFocus();
    expect(lyrics).toHaveTextContent('Une souris verte');
    expect(lyrics).toHaveTextContent('Ça fera un escargot tout chaud !');

    // Nouvelle manche : l'air s'arrête, l'extrait revient.
    rerender(<SongRound key="2" song={song('frere-jacques')} />);
    expect(sourcePlaying()).toBe(false);
    expect(screen.getByRole('region', { name: 'Extrait' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chanter ensemble' })).not.toBeInTheDocument();
  });

  it('un air sans paroles se joue quand même en entier ; « Revenir à l’extrait » l’arrête', async () => {
    const user = userEvent.setup();
    const piece = song('marche-turque');
    expect(piece.lyrics).toBeUndefined();
    render(<SongRound song={piece} />);
    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
    await user.click(screen.getByRole('button', { name: 'Chanter ensemble' }));
    await waitFor(() => expect(sourcePlaying()).toBe(true));
    expect(screen.queryByRole('region', { name: 'Paroles' })).not.toBeInTheDocument();
    expect(screen.getByText(/Pas de paroles pour cet air/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Revenir à l’extrait' }));
    expect(sourcePlaying()).toBe(false);
    expect(screen.getByRole('region', { name: 'Extrait' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chanter ensemble' })).toBeInTheDocument();
  });

  it('l’enfant touche la bonne chanson parmi les images : on peut chanter', async () => {
    const user = userEvent.setup();
    await setSetting('showChoices', true);
    const souris = song('une-souris-verte');
    render(<SongRound song={souris} pool={SONGS} />);
    expect(screen.queryByRole('button', { name: 'Chanter ensemble' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: souris.title }));
    expect(screen.getByRole('button', { name: 'Chanter ensemble' })).toBeInTheDocument();
  });

  it('sans Web Audio, on chante quand même avec les paroles', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const user = userEvent.setup();
    render(<SongRound song={song('frere-jacques')} />);
    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
    await user.click(screen.getByRole('button', { name: 'Chanter ensemble' }));
    const sing = screen.getByRole('region', { name: 'Chanter ensemble' });
    expect(within(sing).getByRole('status')).toHaveTextContent('chantez sans la musique');
    expect(within(sing).getByRole('region', { name: 'Paroles' })).toHaveTextContent(
      'Dormez-vous ?',
    );
  });
});
