import { db } from './db';
import {
  addPlayer,
  cleanName,
  listPlayers,
  MAX_PLAYERS,
  removePlayer,
  renamePlayer,
} from './players';

beforeEach(async () => {
  await db.players.clear();
});

describe('cleanName', () => {
  it('nettoie les espaces', () => expect(cleanName('  Léa   Rose ')).toBe('Léa Rose'));
  it('refuse un prénom vide', () => expect(() => cleanName('   ')).toThrow('vide'));
  it('refuse un prénom trop long', () => expect(() => cleanName('a'.repeat(21))).toThrow('20'));
});

describe('joueurs', () => {
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
