import { db } from './db';
import { startRecord } from './history';
import {
  activePlayers,
  addPlayer,
  listActivePlayers,
  cleanName,
  listPlayers,
  MAX_PLAYERS,
  removePlayer,
  renamePlayer,
  setPlayerLevel,
  setPlayerActive,
} from './players';
import { getSettings, loadSettings } from './settings';

beforeEach(async () => {
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

describe('cleanName', () => {
  it('nettoie les espaces', () => expect(cleanName('  Léa   Rose ')).toBe('Léa Rose'));
  it('refuse un prénom vide', () => expect(() => cleanName('   ')).toThrow('vide'));
  it('refuse un prénom trop long', () => expect(() => cleanName('a'.repeat(21))).toThrow('20'));
});

describe('joueurs', () => {
  it('ont un niveau facultatif, qu’on peut retirer', async () => {
    const id = await addPlayer('Léa');
    expect((await listPlayers())[0].level).toBeUndefined();
    await setPlayerLevel(id, 2);
    expect((await listPlayers())[0].level).toBe(2);
    await setPlayerLevel(id, null);
    expect((await listPlayers())[0]).not.toHaveProperty('level');
  });

  it('ajoute dans l’ordre et alterne les couleurs', async () => {
    await addPlayer('Léa');
    await addPlayer('Sami');
    const players = await listPlayers();
    expect(players.map((p) => p.name)).toEqual(['Léa', 'Sami']);
    expect(players[0].color).not.toBe(players[1].color);
  });

  it('refuse les doublons, sans tenir compte de la casse', async () => {
    await addPlayer('Léa');
    await expect(addPlayer('léa')).rejects.toThrow('déjà');
  });

  it(`limite à ${MAX_PLAYERS} joueurs`, async () => {
    for (let i = 0; i < MAX_PLAYERS; i++) await addPlayer(`Enfant ${i}`);
    await expect(addPlayer('Un de trop')).rejects.toThrow('maximum');
  });

  it('renomme et supprime', async () => {
    const id = await addPlayer('Léa');
    await addPlayer('Sami');
    await expect(renamePlayer(id, 'Sami')).rejects.toThrow('déjà');
    await renamePlayer(id, 'Léonie');
    await removePlayer((await listPlayers())[1].id);
    expect((await listPlayers()).map((p) => p.name)).toEqual(['Léonie']);
  });
});

describe('joueurs actifs (#37)', () => {
  it('tous les joueurs jouent par défaut', async () => {
    await addPlayer('Léa');
    await addPlayer('Sami');
    expect((await listActivePlayers()).map((p) => p.name)).toEqual(['Léa', 'Sami']);
  });

  it('un joueur désactivé n’est pas enregistré avec la partie', async () => {
    const lea = await addPlayer('Léa');
    const sami = await addPlayer('Sami');
    await setPlayerActive(sami, false);
    const id = await startRecord({ gameId: 'lettres', rounds: 10, played: 1, stars: 1 });
    expect((await db.games.get(id))!.playerIds).toEqual([lea]);

    await setPlayerActive(sami, true);
    const next = await startRecord({ gameId: 'lettres', rounds: 10, played: 1, stars: 0 });
    expect((await db.games.get(next))!.playerIds).toEqual([lea, sami]);
  });

  it('aucun joueur enregistré : la partie est enregistrée comme avant', async () => {
    const id = await startRecord({ gameId: 'lettres', rounds: 10, played: 1, stars: 1 });
    expect((await db.games.get(id))!.playerIds).toEqual([]);
  });

  it('la sélection est gardée dans la base', async () => {
    const sami = await addPlayer('Sami');
    await setPlayerActive(sami, false);
    await setPlayerActive(sami, false); // pas de doublon
    expect(getSettings().absentPlayers).toEqual([sami]);
    expect((await loadSettings()).absentPlayers).toEqual([sami]);
  });

  it('un joueur supprimé sort de la liste des absents', async () => {
    const sami = await addPlayer('Sami');
    await setPlayerActive(sami, false);
    await removePlayer(sami);
    expect(getSettings().absentPlayers).toEqual([]);
  });

  it('activePlayers garde l’ordre de la liste', () => {
    const p = (id: number) => ({
      id,
      name: `J${id}`,
      color: 'sky' as const,
      animal: 'renard' as const,
      createdAt: id,
    });
    expect(activePlayers([p(1), p(2), p(3)], [2]).map((x) => x.id)).toEqual([1, 3]);
  });
});
