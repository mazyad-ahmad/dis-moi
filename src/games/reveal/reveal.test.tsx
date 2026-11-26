import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { addItem, createCustomGame } from '../../data/customGames';
import { db, type CustomGame } from '../../data/db';
import { decodeGame, encodeGame } from '../../data/gameFile';
import { getSettings, loadSettings, setSetting } from '../../data/settings';
import { CATALOGUE, findCatalogueGame } from '../catalogue/catalogue';
import {
  blurOf,
  canReveal,
  pixelHeight,
  pixelWidth,
  REVEAL_STEPS,
  revealOn,
  revealsInCatalogue,
} from './reveal';
import { RevealCard } from './RevealCard';

/** Toile 2D simulée (jsdom n'en a pas) : retient les dessins. */
const drawn: { width: number; height: number }[] = [];

beforeEach(() => {
  drawn.length = 0;
  URL.createObjectURL = vi.fn(() => 'blob:photo');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    const { width: canvasWidth } = this; // fixée avant getContext
    return {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: (_img: unknown, _x: number, _y: number, width: number, height: number) => {
        drawn.push({ width, height });
        expect(canvasWidth).toBe(width);
      },
    } as unknown as CanvasRenderingContext2D;
  });
  // Photo de 1280 × 960, décodée tout de suite.
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null;
      naturalWidth = 1280;
      naturalHeight = 960;
      set src(_url: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const photo = new Blob([new Uint8Array(5)], { type: 'image/jpeg' });

describe('Image cachée : les paliers', () => {
  it('premier palier méconnaissable, dernier palier net', () => {
    expect(REVEAL_STEPS).toBe(5);
    // Premier palier : une photo réduite à 6 carrés de large (4,5 de haut), un emoji très flou.
    expect(pixelWidth(0)).toBeLessThanOrEqual(8);
    expect(blurOf(0)).toBeGreaterThanOrEqual(20);
    // Dernier palier : la photo elle-même, l'emoji sans flou.
    expect(pixelWidth(REVEAL_STEPS - 1)).toBeUndefined();
    expect(blurOf(REVEAL_STEPS - 1)).toBe(0);
  });

  it('chaque palier précise l’image', () => {
    for (let s = 1; s < REVEAL_STEPS - 1; s++) {
      expect(pixelWidth(s)!).toBeGreaterThan(pixelWidth(s - 1)!);
      expect(blurOf(s)).toBeLessThan(blurOf(s - 1));
    }
  });

  it('la toile garde les proportions de la photo et reste minuscule', () => {
    expect(pixelHeight(6, 1280, 960)).toBe(5);
    expect(pixelHeight(48, 1280, 960)).toBe(36);
    expect(pixelHeight(12, 960, 1280)).toBe(16);
    expect(pixelHeight(6, 0, 0)).toBe(6);
  });
});

describe('Image cachée : quels jeux', () => {
  it('cartes avec photo ou emoji ; pas les couleurs ni le texte seul', () => {
    expect(canReveal({ answer: 'Mamie', image: photo })).toBe(true);
    expect(canReveal({ answer: 'La joie', emoji: '😀' })).toBe(true);
    expect(canReveal({ answer: 'Rouge', color: '#ff0000' })).toBe(false);
    expect(canReveal({ answer: 'Chat', text: 'Miaou' })).toBe(false);
  });

  it('catalogue : Quelle émotion ?, mais ni les couleurs ni les mimes', () => {
    const ids = CATALOGUE.filter(revealsInCatalogue).map((g) => g.id);
    expect(ids).toContain('emotion');
    for (const id of ['couleur', 'mime', 'emotion-mime', 'animal', 'devinette'])
      expect(ids).not.toContain(id);
    expect(revealsInCatalogue(findCatalogueGame('emotion')!)).toBe(true);
  });

  it('jeu créé : son propre choix ; catalogue : le réglage', () => {
    const custom: CustomGame[] = [
      {
        id: 3,
        name: 'Famille',
        kind: 'image',
        items: [],
        reveal: true,
        createdAt: 0,
        updatedAt: 0,
      },
      { id: 4, name: 'Maison', kind: 'image', items: [], createdAt: 0, updatedAt: 0 },
    ];
    expect(revealOn('perso-3', [], custom)).toBe(true);
    expect(revealOn('perso-4', ['perso-4'], custom)).toBe(false);
    expect(revealOn('emotion', ['emotion'])).toBe(true);
    expect(revealOn('emotion', [])).toBe(false);
  });
});

describe('Carte Image cachée', () => {
  it('photo : pixelisée au départ, plus fine à chaque appui, nette au dernier', async () => {
    const user = userEvent.setup();
    render(<RevealCard item={{ answer: 'Mamie', image: photo, text: 'Qui est-ce ?' }} />);
    const hidden = screen.getByRole('img', { name: 'Image à deviner, encore cachée' });
    await waitFor(() => expect(drawn).toEqual([{ width: 6, height: 5 }]));
    expect(hidden.tagName).toBe('CANVAS');
    expect(hidden).toHaveClass('reveal__pixels');
    expect(screen.getByRole('status')).toHaveTextContent('Palier 1 sur 5');
    // Le texte de la carte pourrait donner la réponse : pas avant l'image nette.
    expect(screen.queryByText('Qui est-ce ?')).not.toBeInTheDocument();

    const more = screen.getByRole('button', { name: 'Préciser l’image' });
    await user.click(more);
    expect(drawn.at(-1)).toEqual({ width: 12, height: 9 });
    expect(screen.getByRole('status')).toHaveTextContent('Palier 2 sur 5');
    await user.click(more);
    await user.click(more);
    expect(drawn.map((d) => d.width)).toEqual([6, 12, 24, 48]);
    await user.click(more);

    const sharp = screen.getByRole('img', { name: 'Image à deviner, nette' });
    expect(sharp.tagName).toBe('IMG');
    expect(sharp).toHaveAttribute('src', 'blob:photo');
    expect(screen.getByRole('status')).toHaveTextContent('Image nette');
    expect(screen.queryByRole('button', { name: 'Préciser l’image' })).not.toBeInTheDocument();
    expect(screen.getByText('Qui est-ce ?')).toBeInTheDocument();
  });

  it('emoji : très flou au départ, sans flou au dernier palier', async () => {
    const user = userEvent.setup();
    render(<RevealCard item={{ answer: 'La joie', emoji: '😀' }} />);
    const face = screen.getByRole('img', { name: 'Image à deviner, encore cachée' });
    expect(face).toHaveStyle({ filter: 'blur(28px)' });
    for (let i = 1; i < REVEAL_STEPS; i++)
      await user.click(screen.getByRole('button', { name: 'Préciser l’image' }));
    expect(screen.getByRole('img', { name: 'Image à deviner, nette' })).not.toHaveStyle({
      filter: 'blur(4px)',
    });
    expect(screen.getByRole('img', { name: 'Image à deviner, nette' }).style.filter).toBe('');
  });
});

describe('Image cachée dans l’appli', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await Promise.all([
      db.players.clear(),
      db.settings.clear(),
      db.games.clear(),
      db.customGames.clear(),
    ]);
    await loadSettings();
  });

  function open(path: string) {
    window.location.hash = `#${path}`;
    return render(<App />);
  }

  it('est proposée à la création d’un jeu Image, et gardée avec le jeu', async () => {
    const user = userEvent.setup();
    open('/ajouter');
    await user.type(screen.getByLabelText('Nom du jeu'), 'Photos de famille');
    expect(screen.queryByRole('radiogroup', { name: 'Montrer l’image' })).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Image'));
    const choice = screen.getByRole('radiogroup', { name: 'Montrer l’image' });
    expect(within(choice).getByLabelText('D’un coup')).toBeChecked();
    await user.click(within(choice).getByLabelText('Image cachée'));
    await user.click(screen.getByRole('button', { name: 'Ajouter les questions' }));
    await screen.findByRole('heading', { name: 'Photos de famille' });
    const [game] = await db.customGames.toArray();
    expect(game).toMatchObject({ kind: 'image', reveal: true });
  });

  it('jeu créé : l’image se dévoile par paliers pendant la partie', async () => {
    const id = await createCustomGame('Famille', 'image', { reveal: true });
    await addItem(id, { answer: 'Mamie', image: photo });
    const user = userEvent.setup();
    open(`/jeu/perso-${id}`);
    expect(
      await screen.findByRole('img', { name: 'Image à deviner, encore cachée' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Préciser l’image' }));
    expect(screen.getByText('Palier 2 sur 5')).toBeInTheDocument();
    // Le parent mène : il peut valider à tout palier, l'étoile est gagnée ensemble.
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(await screen.findByText(/gagnée/)).toBeInTheDocument();
  });

  it('sans l’option, l’image est montrée d’un coup', async () => {
    const id = await createCustomGame('Maison', 'image');
    await addItem(id, { answer: 'La cuisine', image: photo });
    open(`/jeu/perso-${id}`);
    expect(await screen.findByRole('img', { name: 'Image à montrer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Préciser l’image' })).not.toBeInTheDocument();
  });

  it('catalogue : activée depuis l’espace Parent, puis jouée cachée', async () => {
    const user = userEvent.setup();
    await setSetting('catalogue', ['emotion']);
    const view = open('/parent/partie');
    const toggle = await screen.findByRole('button', { name: /^Image cachée : Quelle émotion \?/ });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.queryByRole('button', { name: /^Image cachée : Quelle couleur \?/ }),
    ).not.toBeInTheDocument();
    await user.click(toggle);
    await waitFor(() => expect(getSettings().revealCatalogue).toEqual(['emotion']));
    view.unmount();

    open('/jeu/emotion');
    expect(await screen.findByRole('img', { name: 'Image à deviner, encore cachée' })).toHaveStyle({
      filter: 'blur(28px)',
    });
  });

  it('en montrant, les choix remplacent l’image comme avant', async () => {
    await setSetting('catalogue', ['emotion']);
    await setSetting('revealCatalogue', ['emotion']);
    await setSetting('showChoices', true);
    open('/jeu/emotion');
    expect(await screen.findByRole('region', { name: 'Choix de l’enfant' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Préciser l’image' })).not.toBeInTheDocument();
  });

  it('le fichier de jeu partagé garde l’option', async () => {
    const file = await encodeGame({ name: 'Famille', kind: 'image', items: [], reveal: true });
    expect(file.reveal).toBe(true);
    expect(decodeGame(file).reveal).toBe(true);
    expect(decodeGame({ ...file, kind: 'question' }).reveal).toBeUndefined();
    expect((await encodeGame({ name: 'Maison', kind: 'image', items: [] })).reveal).toBeUndefined();
  });
});
