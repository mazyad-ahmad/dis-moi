import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db, type Player } from '../data/db';
import { loadSettings, setSetting } from '../data/settings';
import { SONGS } from './chanson/songs';
import type { Level } from './levels';

/** Joueurs lus dans la base avant le premier rendu : on laisse le temps à un appareil chargé. */
const slow = { timeout: 5000 };

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const KIDS: Omit<Player, 'id'>[] = [
  { name: 'Léa', animal: 'renard', color: 'meadow', createdAt: 1 },
  { name: 'Sami', animal: 'ours', color: 'sky', createdAt: 2 },
  { name: 'Noé', animal: 'lapin', color: 'rose', createdAt: 3 },
];

async function addKids(count: number, levels: (Level | undefined)[] = []) {
  const ids: number[] = [];
  for (let i = 0; i < count; i++)
    ids.push(await db.players.add({ ...KIDS[i], level: levels[i] } as Player));
  return ids;
}

const banner = () => screen.queryByText(/^À toi,/);

it('accueil : le choix « Chacun son tour » apparaît dès deux joueurs actifs', async () => {
  const user = userEvent.setup();
  const [lea] = await addKids(2);
  open('/');
  await user.click(await screen.findByRole('button', { name: /La partie/ }, slow));
  const team = await screen.findByRole('radio', { name: 'En équipe' }, slow);
  expect(team).toBeChecked();

  await user.click(screen.getByRole('radio', { name: 'Chacun son tour' }));
  await waitFor(async () =>
    expect(await db.settings.get('turnMode')).toMatchObject({ value: 'turns' }),
  );

  // Un seul joueur actif : on joue en équipe, le choix disparaît (les autres réglages restent).
  await setSetting('absentPlayers', [lea + 1]);
  await waitFor(() => expect(screen.queryByRole('radio', { name: 'En équipe' })).toBeNull());
  expect(screen.getByRole('radio', { name: 'Normal' })).toBeChecked();
}, 30_000);

it('3 joueurs, 10 manches : chacun son tour, 4-3-3, étoiles communes et aucun classement', async () => {
  const user = userEvent.setup();
  const ids = await addKids(3);
  await setSetting('turnMode', 'turns');
  open('/jeu/lettres');

  const names: string[] = [];
  for (let i = 1; i <= 10; i++) {
    expect(await screen.findByText(`Manche ${i} sur 10`, {}, slow)).toBeInTheDocument();
    const turn = screen.getByText(/^À toi,/);
    names.push(turn.querySelector('strong')!.textContent!);
    await user.click(screen.getByRole('button', { name: i % 2 ? 'Trouvé' : 'Passer' }));
  }
  // Chacun son tour, dans un ordre tiré au sort puis répété.
  expect(new Set(names.slice(0, 3)).size).toBe(3);
  names.forEach((n, i) => i >= 3 && expect(n).toBe(names[i - 3]));

  // Écran de fin : les étoiles de tous, aucun prénom (pas de classement).
  expect(
    await screen.findByRole('heading', { name: '5 étoiles gagnées ensemble !' }),
  ).toBeInTheDocument();
  for (const kid of KIDS) expect(screen.queryByText(new RegExp(kid.name))).toBeNull();

  // On note seulement qui a joué chaque manche.
  await waitFor(async () => {
    const [record] = await db.games.toArray();
    expect(record).toMatchObject({ played: 10, stars: 5 });
    const counts = ids.map((id) => record.turns!.filter((t) => t === id).length);
    expect(counts.sort().reverse()).toEqual([4, 3, 3]);
  });

  // L'historique des étoiles ne compte rien par enfant.
  await user.click(screen.getByRole('link', { name: 'Accueil' }));
  await user.click(await screen.findByRole('link', { name: 'Étoiles' }));
  await screen.findByRole('region', { name: 'Dernières parties' });
  expect(screen.queryByText(/classement|gagnant|1er|premier/i)).toBeNull();
}, 30_000);

it('un seul joueur actif : « chacun son tour » se joue en équipe', async () => {
  const user = userEvent.setup();
  await addKids(1);
  await setSetting('turnMode', 'turns');
  open('/jeu/lettres');
  expect(await screen.findByText('Manche 1 sur 10', {}, slow)).toBeInTheDocument();
  expect(banner()).toBeFalsy();
  await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  await waitFor(async () => expect(await db.games.count()).toBe(1));
  expect((await db.games.toArray())[0].turns).toBeUndefined();
}, 30_000);

it('en équipe : pas de prénom en haut de la manche', async () => {
  await addKids(2);
  open('/jeu/dessin');
  expect(await screen.findByText('Manche 1 sur 10', {}, slow)).toBeInTheDocument();
  expect(banner()).toBeFalsy();
}, 30_000);

it('chaque chanson est tirée au niveau de l’enfant dont c’est le tour', async () => {
  const ids = await addKids(2, [1, 3]);
  await setSetting('turnMode', 'turns');
  await setSetting('rounds', 5);
  open('/jeu/chanson');
  expect(await screen.findByText('Manche 1 sur 5', {}, slow)).toBeInTheDocument();

  const saved = JSON.parse(sessionStorage.getItem('dis-moi:partie:chanson')!) as {
    turns: number[];
    draw: string[];
  };
  expect([...saved.turns].sort()).toEqual([...ids].sort());
  const level = new Map(SONGS.map((s) => [s.id, s.level]));
  const kidLevel = new Map([
    [ids[0], 1],
    [ids[1], 3],
  ]);
  // Niveau 3 : deux chansons seulement, puis repli sur le niveau voisin (2).
  saved.draw.forEach((id, i) => {
    const wanted = kidLevel.get(saved.turns[i % 2])!;
    const got = level.get(id)!;
    expect(Math.abs(got - wanted)).toBeLessThanOrEqual(i < 4 ? 0 : 1);
  });
  // Le prénom de l'enfant du tour est affiché en grand, avec son avatar.
  const first = KIDS[ids.indexOf(saved.turns[0])];
  expect(screen.getByText(/^À toi,/)).toHaveTextContent(`À toi, ${first.name} !`);
  expect(screen.getByRole('img', { name: `${first.name}, ${first.animal}` })).toBeInTheDocument();
}, 30_000);

it('Dessine ça et le Grand Jeu passent aussi chacun leur tour', async () => {
  const user = userEvent.setup();
  await addKids(2);
  await setSetting('turnMode', 'turns');
  await setSetting('rounds', 5);
  const app = open('/jeu/dessin');
  expect(await screen.findByText('Manche 1 sur 5', {}, slow)).toBeInTheDocument();
  const first = screen.getByText(/^À toi,/).textContent;
  // « Autre mot » : même enfant.
  await user.click(screen.getByRole('button', { name: 'Autre mot' }));
  expect(screen.getByText(/^À toi,/).textContent).toBe(first);
  await user.click(screen.getByRole('button', { name: "C'est fini" }));
  expect(await screen.findByText('Manche 2 sur 5')).toBeInTheDocument();
  expect(screen.getByText(/^À toi,/).textContent).not.toBe(first);
  app.unmount();

  open('/jeu/grand-jeu');
  expect(await screen.findByText('Manche 1 sur 5', {}, slow)).toBeInTheDocument();
  expect(screen.getByText(/^À toi,/)).toBeInTheDocument();
}, 30_000);

it('répondre en montrant : autant de choix que le niveau de l’enfant du tour', async () => {
  const user = userEvent.setup();
  const ids = await addKids(2, [1, 3]);
  await setSetting('turnMode', 'turns');
  await setSetting('showChoices', true);
  open('/jeu/lettres');
  const count = new Map([
    [ids[0], 2],
    [ids[1], 4],
  ]);
  for (let i = 1; i <= 3; i++) {
    expect(await screen.findByText(`Manche ${i} sur 10`, {}, slow)).toBeInTheDocument();
    const name = screen.getByText(/^À toi,/).querySelector('strong')!.textContent;
    const id = ids[KIDS.findIndex((k) => k.name === name)];
    const board = screen.getByRole('region', { name: 'Choix de l’enfant' });
    expect(within(board).getAllByRole('button')).toHaveLength(count.get(id)!);
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  }
}, 30_000);
