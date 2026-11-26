import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { createCustomGame } from '../data/customGames';
import { db } from '../data/db';
import { PhotoError, preparePhoto } from '../data/media';

// Le décodage d'image n'existe pas dans jsdom : on simule la préparation de la photo.
vi.mock('../data/media', async (original) => ({
  ...(await original<typeof import('../data/media')>()),
  preparePhoto: vi.fn(),
}));
const prepare = vi.mocked(preparePhoto);

const file = () => new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' });
const ready = new Blob([new Uint8Array(5)], { type: 'image/jpeg' });

beforeEach(async () => {
  await db.customGames.clear();
  prepare.mockReset();
  URL.createObjectURL = vi.fn(() => 'blob:photo');
  URL.revokeObjectURL = vi.fn();
});

async function openImageGame() {
  const id = await createCustomGame('Ma maison', 'image');
  window.location.hash = `#/creer/${id}`;
  render(<App />);
  await screen.findByRole('heading', { name: 'Ma maison' });
  return id;
}

describe('Carte photo d’un jeu créé (#142)', () => {
  it('le bouton ouvre le sélecteur de photos dans le geste du parent', async () => {
    const user = userEvent.setup();
    await openImageGame();
    const input = screen.getByLabelText<HTMLInputElement>('Photo de la carte');
    expect(input).toHaveAttribute('accept', 'image/*');
    expect(input).not.toHaveAttribute('capture'); // galerie ou appareil photo, au choix
    const click = vi.spyOn(input, 'click');
    await user.click(screen.getByRole('button', { name: 'Ajouter une photo' }));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('la photo s’affiche dans la carte et la carte s’enregistre', async () => {
    const user = userEvent.setup();
    prepare.mockResolvedValue(ready);
    const id = await openImageGame();
    const input = screen.getByLabelText<HTMLInputElement>('Photo de la carte');
    await user.upload(input, file());
    expect(await screen.findByRole('button', { name: 'Changer la photo' })).toBeInTheDocument();
    expect(document.querySelector('.item-form img')).toHaveAttribute('src', 'blob:photo');
    expect(input.value).toBe(''); // la même photo pourra être reprise

    await user.type(screen.getByLabelText('Réponse'), 'La cuisine');
    await user.click(screen.getByRole('button', { name: 'Ajouter la carte' }));
    expect(await screen.findByText('1 carte')).toBeInTheDocument();
    const game = await db.customGames.get(id);
    expect(game?.items[0].image).toBeDefined(); // (fake-indexeddb ne garde pas un vrai Blob)
    expect(game?.items[0].answer).toBe('La cuisine');

    // Carte suivante : la même photo peut être choisie de nouveau.
    await user.upload(screen.getByLabelText('Photo de la carte'), file());
    await waitFor(() => expect(prepare).toHaveBeenCalledTimes(2));
  });

  it('une photo illisible donne un message clair', async () => {
    const user = userEvent.setup();
    prepare.mockRejectedValue(new PhotoError('Cette photo ne peut pas être lue sur ce téléphone.'));
    await openImageGame();
    await user.upload(screen.getByLabelText('Photo de la carte'), file());
    expect(await screen.findByRole('alert')).toHaveTextContent('ne peut pas être lue');
    expect(screen.getByRole('button', { name: 'Ajouter une photo' })).toBeEnabled();
  });

  it('un échec inattendu ne passe pas sous silence', async () => {
    const user = userEvent.setup();
    prepare.mockRejectedValue(new Error('boom'));
    await openImageGame();
    await user.upload(screen.getByLabelText('Photo de la carte'), file());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de préparer cette photo',
    );
  });

  it('un téléphone plein donne un message clair à l’enregistrement', async () => {
    const user = userEvent.setup();
    prepare.mockResolvedValue(ready);
    await openImageGame();
    await user.upload(screen.getByLabelText('Photo de la carte'), file());
    await screen.findByRole('button', { name: 'Changer la photo' });
    vi.spyOn(db.customGames, 'update').mockRejectedValue(
      new DOMException('plein', 'QuotaExceededError'),
    );
    await user.type(screen.getByLabelText('Réponse'), 'La cuisine');
    await user.click(screen.getByRole('button', { name: 'Ajouter la carte' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Plus assez de place');
  });

  it('on ne peut pas enregistrer pendant la préparation de la photo', async () => {
    const user = userEvent.setup();
    let done: (b: Blob) => void = () => {};
    prepare.mockReturnValue(new Promise((ok) => (done = ok)));
    await openImageGame();
    await user.upload(screen.getByLabelText('Photo de la carte'), file());
    expect(await screen.findByText('Préparation de la photo…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter la carte' })).toBeDisabled();
    done(ready);
    expect(await screen.findByRole('button', { name: 'Ajouter la carte' })).toBeEnabled();
  });
});
