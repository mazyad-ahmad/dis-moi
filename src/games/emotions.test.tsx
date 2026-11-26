import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { getPack } from '../content/packs';
import { db } from '../data/db';
import { loadSettings, setSetting } from '../data/settings';
import { findCatalogueGame } from './catalogue/catalogue';
import { deckChoicePool } from './choices/choices';
import { suitsMode } from './modes';

// #58 : Les émotions. Deux sens de jeu : reconnaître l'émotion d'un visage (Quelle émotion ?)
// ou la mimer pour que le parent devine (Mime l'émotion), avec une question pour en parler.

const faces = getPack('emotion');
const mimes = getPack('emotion-mime');

describe('contenu des émotions', () => {
  it('au moins 12 émotions, des plus simples aux plus fines selon le niveau', () => {
    expect(faces.items.length).toBeGreaterThanOrEqual(12);
    const level = (id: string) => faces.items.find((i) => i.id === id)?.level;
    expect([level('joie'), level('colere')]).toEqual([1, 1]);
    expect([level('fierte'), level('jalousie')]).toEqual([3, 3]);
    expect(new Set(faces.items.map((i) => i.level))).toEqual(new Set([1, 2, 3]));
    for (const item of faces.items) expect(item.emoji).toBeTruthy();
  });

  it('les deux sens de jeu ont les mêmes émotions et les mêmes questions', () => {
    const strip = (items: typeof faces.items) =>
      items.map(({ id, level, answer, emoji, talk }) => ({ id, level, answer, emoji, talk }));
    expect(strip(mimes.items)).toEqual(strip(faces.items));
    for (const item of mimes.items) expect(item.text).toBeTruthy();
  });

  it('chaque émotion a une question ouverte et bienveillante pour en parler', () => {
    for (const { talk, answer } of faces.items) {
      expect(talk, answer).toBeTruthy();
      // Ouverte : on ne répond pas par oui ou non ; jamais de « pourquoi », qui sonne comme un reproche.
      expect(talk, answer).toMatch(/^(Qu|Quand|Comment|Où|Qui|À qui|Que)/);
      expect(talk, answer).toMatch(/ \?$/);
      expect(talk!.toLowerCase(), answer).not.toMatch(/pourquoi|méchant|vilain|bêtise|punition/);
    }
  });

  it('le mime fait bouger : pas au coucher, ni en voiture, et pas de choix à montrer', () => {
    const mime = findCatalogueGame('emotion-mime')!;
    expect(suitsMode(mime.needs, 'coucher')).toBe(false);
    expect(suitsMode(mime.needs, 'voiture')).toBe(false);
    expect(deckChoicePool(mime)).toBeUndefined();
    const game = findCatalogueGame('emotion')!;
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
    expect(deckChoicePool(game)).toBe(game.items);
  });
});

describe('jouer aux émotions', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await Promise.all([db.players.clear(), db.settings.clear()]);
    await loadSettings();
  });

  function open(path: string) {
    window.location.hash = `#${path}`;
    return render(<App />);
  }

  it('Quelle émotion ? : un visage en grand, la réponse et la question pour en parler', async () => {
    const user = userEvent.setup();
    await setSetting('catalogue', ['emotion']);
    open('/jeu/emotion');
    const face = await screen.findByRole('img', { name: 'Image à montrer' });
    const item = faces.items.find((i) => i.emoji === face.textContent)!;
    expect(screen.queryByText(/Pour en parler/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    expect(within(parent).getByText(new RegExp(item.answer))).toBeInTheDocument();
    expect(within(parent).getByText(item.talk!)).toBeInTheDocument();
  });

  it('en montrant : les visages au choix, la question pour en parler visible', async () => {
    await setSetting('showChoices', true);
    await setSetting('catalogue', ['emotion']);
    open('/jeu/emotion');
    const board = await screen.findByRole('region', { name: 'Choix de l’enfant' });
    await waitFor(() => expect(within(board).getAllByRole('button')).toHaveLength(3));
    const asked = screen.getByText(/Demande à l’enfant de montrer/).querySelector('strong')!;
    const item = faces.items.find((i) => i.answer === asked.textContent)!;
    expect(screen.getByText(item.talk!)).toBeInTheDocument();
  });

  it('Mime l’émotion : l’enfant voit ce qu’il mime, le parent devine', async () => {
    const user = userEvent.setup();
    await setSetting('showChoices', true);
    await setSetting('catalogue', ['emotion-mime']);
    open('/jeu/emotion-mime');
    expect(await screen.findByText("Montre l'écran à l'enfant")).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();
    const text = mimes.items.find((i) => screen.queryByText(i.text!))!;
    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
    expect(screen.getByText(text.talk!)).toBeInTheDocument();
  });
});
