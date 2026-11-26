import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { getPack, PackError, validatePack } from '../../content/packs';
import { customDeck } from '../../data/customGames';
import { db, type CustomGame } from '../../data/db';
import { gameToFile, parseGameFile } from '../../data/gameFile';
import { loadSettings, setSetting } from '../../data/settings';
import { findCatalogueGame } from '../catalogue/catalogue';
import { suitsMode } from '../modes';
import { DeckRound } from './DeckGame';

// #61 : Ombres, l'image en silhouette, révélée en couleur avec la réponse.

const game = findCatalogueGame('ombre')!;
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('Ombres : le pack', () => {
  it('36 emoji, 12 par niveau, tous montrés en ombre', () => {
    expect(game.kind).toBe('image');
    expect(game.items).toHaveLength(36);
    for (const level of [1, 2, 3])
      expect(game.items.filter((i) => i.level === level)).toHaveLength(12);
    for (const item of game.items) {
      expect(item.emoji).toBeTruthy();
      expect(item.color).toBeUndefined();
      expect(item.text).toBeUndefined();
      expect(item.hint).toBeTruthy();
      expect(item.shadow).toBe(true);
    }
  });

  it('à regarder : au Coucher, pas en Voiture', () => {
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
    expect(suitsMode(game.needs, 'voiture')).toBe(false);
  });

  it('« shadow » est réservé aux jeux d’images', () => {
    const pack = JSON.parse(JSON.stringify(getPack('devinette')));
    expect(() => validatePack({ ...pack, shadow: true }, 'test.json')).toThrow(PackError);
    expect(() => validatePack({ ...getPack('ombre'), shadow: false }, 'test.json')).toThrow(
      PackError,
    );
  });

  it('les autres jeux d’images restent en couleur', () => {
    expect(findCatalogueGame('couleur')!.items.some((i) => i.shadow)).toBe(false);
    expect(findCatalogueGame('emotion')!.items.some((i) => i.shadow)).toBe(false);
  });
});

describe('Ombres : la révélation', () => {
  const item = game.items[0];

  it('silhouette jusqu’à « Voir la réponse », puis l’image en couleur', async () => {
    const user = userEvent.setup();
    render(<DeckRound kind="image" item={item} />);
    const shadow = screen.getByRole('img', { name: 'Ombre à deviner' });
    expect(shadow).toHaveClass('shadow-reveal', 'is-shadow');
    expect(screen.getByText(/qui se cache/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
    const image = screen.getByRole('img', { name: 'Image à montrer' });
    expect(image).toBe(shadow);
    expect(image).toHaveClass('shadow-reveal');
    expect(image).not.toHaveClass('is-shadow');
    expect(screen.getByText(`${item.emoji} ${item.answer}`)).toBeInTheDocument();
  });

  it('une carte sans ombre ne change pas', () => {
    render(<DeckRound kind="image" item={{ ...item, shadow: undefined }} />);
    expect(screen.getByRole('img', { name: 'Image à montrer' })).not.toHaveClass('shadow-reveal');
  });

  it('silhouette lisible jour et nuit, fondu coupé par « réduire les animations »', () => {
    const ui = read('src/components/ui.css');
    expect(ui).toMatch(/\.shadow-reveal \{[^}]*transition: filter/);
    expect(ui).toMatch(
      /\.deck-card__emoji\.is-shadow \{\s*filter: brightness\(0\) invert\(var\(--silhouette-invert\)\);/,
    );
    // Nuit : silhouette claire, choisie par le parent ou suivie du téléphone.
    expect(ui).toMatch(
      /:root\[data-theme='night'\] \.shadow-reveal \{\s*--silhouette-invert: 0\.9/,
    );
    expect(ui).toMatch(
      /prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme='light'\]\) \.shadow-reveal \{\s*--silhouette-invert: 0\.9/,
    );
    expect(read('src/styles/global.css')).toMatch(
      /prefers-reduced-motion: reduce\) \{\s*\* \{\s*transition: none !important;/,
    );
  });
});

describe('Ombres, en jeu', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
    await loadSettings();
    await setSetting('catalogue', ['ombre']);
  });

  it('en montrant : les choix en couleur s’ajoutent sous l’ombre', async () => {
    await setSetting('showChoices', true);
    await setSetting('gameLevel', 1);
    window.location.hash = '#/jeu/ombre';
    render(<App />);
    const board = await screen.findByRole('region', { name: 'Choix de l’enfant' });
    expect(within(board).getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Ombre à deviner' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voir la réponse' })).toBeInTheDocument();
  });
});

describe('Ombres dans les jeux créés', () => {
  const created = (kind: CustomGame['kind'], shadow?: boolean): CustomGame => ({
    id: 1,
    name: 'Ma maison',
    kind,
    items: [{ answer: 'Pomme', emoji: '🍎' }],
    ...(shadow && { shadow }),
    createdAt: 0,
    updatedAt: 0,
  });

  it('un jeu Image en ombres montre chaque carte dans l’ombre', () => {
    expect(customDeck(created('image', true)).items[0].shadow).toBe(true);
    expect(customDeck(created('image')).items[0].shadow).toBeUndefined();
  });

  it('le choix suit le fichier du jeu, seulement pour un jeu Image', async () => {
    const copy = parseGameFile(await (await gameToFile(created('image', true))).text());
    expect(copy.shadow).toBe(true);
    expect(copy.items[0].shadow).toBeUndefined();
    const file = JSON.parse(await (await gameToFile(created('image', true))).text());
    expect(parseGameFile(JSON.stringify({ ...file, kind: 'question', items: [] })).shadow).toBe(
      undefined,
    );
  });

  it('une photo reste dans l’ombre, sans détourage', async () => {
    const user = userEvent.setup();
    const photo = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
    URL.createObjectURL ??= () => 'blob:photo';
    URL.revokeObjectURL ??= () => {};
    render(<DeckRound kind="image" item={{ answer: 'La cuisine', image: photo, shadow: true }} />);
    expect(await screen.findByRole('img', { name: 'Ombre à deviner' })).toHaveClass('is-shadow');
    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
    expect(screen.getByRole('img', { name: 'Image à montrer' })).not.toHaveClass('is-shadow');
  });
});
