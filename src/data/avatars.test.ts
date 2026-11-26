import { Dexie } from 'dexie';
import { db, PLAYER_ANIMALS, PLAYER_COLORS } from './db';
import {
  addPlayer,
  avatarLabel,
  freeAvatar,
  listPlayers,
  MAX_PLAYERS,
  setPlayerAvatar,
} from './players';

beforeEach(async () => {
  await db.players.clear();
});

describe('avatars', () => {
  it('a un nom accessible : prénom et animal', () => {
    expect(avatarLabel({ name: 'Léa', animal: 'renard' })).toBe('Léa, renard');
  });

  it('donne à chaque nouveau joueur un animal et une couleur que personne n’a', async () => {
    expect(PLAYER_COLORS.length).toBeGreaterThanOrEqual(MAX_PLAYERS);
    for (let i = 0; i < MAX_PLAYERS; i++) await addPlayer(`Enfant ${i}`);
    const players = await listPlayers();
    expect(new Set(players.map((p) => p.animal)).size).toBe(MAX_PLAYERS);
    expect(new Set(players.map((p) => p.color)).size).toBe(MAX_PLAYERS);
  });

  it('reprend l’animal et la couleur libérés par un joueur retiré', () => {
    expect(
      freeAvatar([
        { animal: 'ours', color: 'sky' },
        { animal: 'lapin', color: 'meadow' },
      ]),
    ).toEqual({ animal: 'renard', color: 'dawn' });
  });

  it('garde l’avatar choisi à la création, et le change ensuite', async () => {
    const id = await addPlayer('Léa', { animal: 'tortue', color: 'rose' });
    expect((await db.players.get(id))!).toMatchObject({ animal: 'tortue', color: 'rose' });
    await setPlayerAvatar(id, { animal: 'koala' });
    expect((await db.players.get(id))!).toMatchObject({ animal: 'koala', color: 'rose' });
  });
});

describe('migration de la base', () => {
  afterEach(async () => {
    db.close();
    await Dexie.delete('dis-moi');
    await db.open();
  });

  it('donne un avatar par défaut aux joueurs existants, en gardant leur couleur', async () => {
    db.close();
    await Dexie.delete('dis-moi');
    // La base telle qu'elle était avant les avatars (version 4).
    const old = new Dexie('dis-moi');
    old.version(4).stores({
      players: '++id, createdAt',
      settings: 'key',
      games: '++id, startedAt, gameId',
      customGames: '++id, createdAt',
      praises: '++id, createdAt',
    });
    await old.table('players').bulkAdd([
      { name: 'Sami', color: 'sky', createdAt: 2 },
      { name: 'Léa', color: 'dawn', createdAt: 1 },
      { name: 'Noé', color: 'violet', createdAt: 3 },
    ]);
    old.close();

    await db.open();
    const players = await listPlayers();
    expect(players.map((p) => [p.name, p.animal, p.color])).toEqual([
      ['Léa', PLAYER_ANIMALS[0].id, 'dawn'],
      ['Sami', PLAYER_ANIMALS[1].id, 'sky'],
      // Couleur inconnue : remplacée.
      ['Noé', PLAYER_ANIMALS[2].id, PLAYER_COLORS[2]],
    ]);
  });
});
