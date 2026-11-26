import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { addStory, MAX_STORIES } from '../../data/stories';
import { DAILY_SOURCES } from '../defi/daily';
import { grandGames } from '../grand/pool';
import { LEVELS } from '../levels';
import { suitsMode } from '../modes';
import { findGame, GAMES } from '../registry';
import {
  HEROES,
  HISTOIRE_ID,
  NO_STAR_MESSAGE,
  OBJECTS,
  PLACES,
  storyStart,
  storyTitle,
  THANKS_LABEL,
} from './histoire';

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([
    db.players.clear(),
    db.settings.clear(),
    db.games.clear(),
    db.stories.clear(),
  ]);
  await loadSettings();
  await setSetting('rounds', 3);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (navigator as { mediaDevices?: unknown }).mediaDevices;
  delete document.documentElement.dataset.theme;
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

/** Micro factice : un MediaRecorder qui rend un petit Blob à l'arrêt. */
function fakeMic() {
  const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: () => {} }] }));
  class FakeRecorder {
    static isTypeSupported = () => true;
    state = 'inactive';
    mimeType = 'audio/webm';
    ondataavailable?: (e: { data: Blob }) => void;
    onstop?: () => void;
    constructor(public stream: unknown) {}
    start() {
      this.state = 'recording';
    }
    stop() {
      if (this.state !== 'recording') return;
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['histoire'], { type: 'audio/webm' }) });
      this.onstop?.();
    }
  }
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
  });
  return getUserMedia;
}

describe('images de Histoire à inventer', () => {
  it('au moins 30 héros, 30 lieux et 30 objets, à chaque niveau', () => {
    for (const part of [HEROES, PLACES, OBJECTS]) {
      expect(part.length).toBeGreaterThanOrEqual(30);
      for (const { value } of LEVELS)
        expect(part.filter((i) => i.level === value).length).toBeGreaterThanOrEqual(10);
      for (const item of part) expect(item.emoji).toBeTruthy();
      expect(new Set(part.map((i) => i.emoji)).size).toBe(part.length);
    }
  });

  it('une phrase de départ que le parent lit', () => {
    const [hero, place, object] = [HEROES[0], PLACES[0], OBJECTS[0]];
    expect(storyStart(hero, place, object)).toBe(
      `Il était une fois ${hero.answer}, ${place.answer}, avec ${object.answer}…`,
    );
  });

  it('jeu de base oral, jouable en Voiture et au Coucher, ni dans le Grand Jeu ni dans le défi', () => {
    const game = findGame(HISTOIRE_ID)!;
    expect(game.name).toBe('Histoire à inventer');
    expect(suitsMode(game.needs, 'voiture')).toBe(true);
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
    expect(game.levels).toEqual([1, 2, 3]);
    expect(grandGames(GAMES, []).map((g) => g.id)).not.toContain(HISTOIRE_ID);
    expect(DAILY_SOURCES.map((s) => s.game)).not.toContain(HISTOIRE_ID);
  });
});

describe('une partie de Histoire à inventer', () => {
  it('trois images, des relances, « Merci » donne l’étoile et « Passer » n’en retire pas', async () => {
    const user = userEvent.setup();
    open(`/jeu/${HISTOIRE_ID}`);
    expect(await screen.findByText('Manche 1 sur 3')).toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Histoire' });
    for (const role of ['Un héros', 'Un lieu', 'Un objet'])
      expect(within(card).getByText(role)).toBeInTheDocument();
    expect(within(card).getByText(/^Il était une fois /)).toBeInTheDocument();
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    expect(parent).toHaveTextContent('« Et après ? »');
    expect(parent).toHaveTextContent('« Qui arrive ? »');
    expect(screen.queryByRole('button', { name: 'Trouvé' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: THANKS_LABEL }));
    expect(await screen.findByText('Manche 2 sur 3')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Passer' }));
    expect(await screen.findByText('Manche 3 sur 3')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: THANKS_LABEL }));
    expect(
      await screen.findByRole('heading', { name: '2 étoiles gagnées ensemble !' }),
    ).toBeInTheDocument();
  });

  it('5 histoires au plus par partie ; tout passer finit sur un mot doux', async () => {
    const user = userEvent.setup();
    await setSetting('rounds', 10);
    open(`/jeu/${HISTOIRE_ID}`);
    for (let i = 1; i <= 5; i++) {
      expect(await screen.findByText(`Manche ${i} sur 5`)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Passer' }));
    }
    expect(await screen.findByText(NO_STAR_MESSAGE)).toBeInTheDocument();
  });

  it('sans micro : rien à enregistrer', async () => {
    open(`/jeu/${HISTOIRE_ID}`);
    expect(await screen.findByText('Manche 1 sur 3')).toBeInTheDocument();
    expect(screen.getByText('Rien n’est enregistré : l’histoire reste entre vous.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Enregistrer/ })).not.toBeInTheDocument();
  });

  it.each(['voiture', 'coucher'] as const)('se joue en mode %s', async (mode) => {
    const user = userEvent.setup();
    await setSetting('gameMode', mode);
    open('/');
    await user.click(await screen.findByRole('link', { name: /Histoire à inventer/ }));
    expect(await screen.findByText('Manche 1 sur 3')).toBeInTheDocument();
  });
});

describe('Livre d’histoires', () => {
  it('le micro ne s’allume que sur l’appui du parent ; l’histoire se réécoute et se supprime', async () => {
    const user = userEvent.setup();
    const getUserMedia = fakeMic();
    const { unmount } = open(`/jeu/${HISTOIRE_ID}`);
    expect(await screen.findByText('Manche 1 sur 3')).toBeInTheDocument();
    const words = [...document.querySelectorAll('.story-part__word')].map((e) => e.textContent);
    expect(getUserMedia).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Enregistrer l’histoire' }));
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    await user.click(await screen.findByRole('button', { name: 'Arrêter l’enregistrement' }));
    expect(await screen.findByRole('button', { name: 'Réécouter l’histoire' })).toBeVisible();
    expect(screen.getByText('Gardée dans le Livre d’histoires (espace Parent).')).toBeVisible();

    const stories = await db.stories.toArray();
    expect(stories).toHaveLength(1);
    expect(stories[0].parts.map((p) => p.answer.toLowerCase())).toEqual(
      words.map((w) => w!.toLowerCase()),
    );
    // Rien d'autre que les étoiles dans la partie.
    expect(JSON.stringify(await db.games.toArray())).not.toContain(stories[0].parts[0].answer);
    unmount();

    open('/parent');
    const book = await screen.findByRole('list', { name: 'Histoires enregistrées' });
    const title = storyTitle(stories[0].parts);
    expect(within(book).getByText(title)).toBeInTheDocument();
    expect(
      within(book).getByRole('button', { name: `Écouter l’histoire : ${title}` }),
    ).toBeVisible();
    await user.click(within(book).getByRole('button', { name: `Supprimer l’histoire : ${title}` }));
    await user.click(await screen.findByRole('button', { name: 'Supprimer' }));
    await waitFor(async () => expect(await db.stories.count()).toBe(0));
    expect(await screen.findByText(/Pas encore d’histoire/)).toBeVisible();
  });

  it('passer à la manche suivante pendant l’enregistrement garde l’histoire', async () => {
    const user = userEvent.setup();
    fakeMic();
    open(`/jeu/${HISTOIRE_ID}`);
    await user.click(await screen.findByRole('button', { name: 'Enregistrer l’histoire' }));
    await screen.findByRole('button', { name: 'Arrêter l’enregistrement' });
    await user.click(screen.getByRole('button', { name: THANKS_LABEL }));
    expect(await screen.findByText('Manche 2 sur 3')).toBeInTheDocument();
    await waitFor(async () => expect(await db.stories.count()).toBe(1));
    expect(screen.getByRole('button', { name: 'Enregistrer l’histoire' })).toBeVisible();
  });

  it('livre plein : plus d’enregistrement proposé', async () => {
    fakeMic();
    for (let i = 0; i < MAX_STORIES; i++)
      await addStory(new Blob(['x']), [{ answer: 'un chat', emoji: '🐱' }]);
    expect(await addStory(new Blob(['x']), [])).toBeNull();
    open(`/jeu/${HISTOIRE_ID}`);
    expect(await screen.findByText(/Le Livre d’histoires est plein/)).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Enregistrer l’histoire' }),
    ).not.toBeInTheDocument();
  });

  it('« Effacer toutes les données » supprime les histoires', async () => {
    const user = userEvent.setup();
    await addStory(new Blob(['x']), [{ answer: 'un chat', emoji: '🐱' }]);
    open('/parent');
    expect(await screen.findByRole('list', { name: 'Histoires enregistrées' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Effacer toutes les données' }));
    await user.click(await screen.findByRole('button', { name: 'Tout effacer' }));
    await waitFor(async () => expect(await db.stories.count()).toBe(0));
  });
});
