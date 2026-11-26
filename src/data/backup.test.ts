import {
  BACKUP_VERSION,
  backupFileName,
  createBackupFile,
  MAX_BACKUP_SIZE,
  needsBackupReminder,
  parseBackup,
  readBackupFile,
  restoreBackup,
} from './backup';
import { addItem, createCustomGame } from './customGames';
import { db } from './db';
import { startRecord, updateRecord } from './history';
import { addPlayer } from './players';
import { getSettings, loadSettings, setSetting } from './settings';

const TABLES = [db.players, db.games, db.customGames, db.settings];

beforeEach(async () => {
  await Promise.all(TABLES.map((t) => t.clear()));
  await loadSettings();
});

async function snapshot() {
  const [players, games, customGames, settings] = await Promise.all(TABLES.map((t) => t.toArray()));
  return { players, games, customGames, settings };
}

/** Un téléphone avec joueurs, parties, réglages et un jeu créé (médias : voir e2e). */
async function fillPhone() {
  await addPlayer('Léa');
  await addPlayer('Sami');
  const r = await startRecord({ gameId: 'lettres', rounds: 5, played: 1, stars: 1 });
  await updateRecord(r, { played: 5, stars: 4 });
  await startRecord({ gameId: 'chanson', rounds: 10, played: 1, stars: 0 });
  await setSetting('theme', 'night');
  await setSetting('rounds', 15);
  await setSetting('catalogue', ['devinette']);
  const id = await createCustomGame('Devinettes de Léa', 'question');
  await addItem(id, { answer: 'Un chat', text: 'Il miaule', hint: 'Il a des moustaches' });
}

async function backupText(now = Date.UTC(2026, 10, 25)) {
  return (await createBackupFile(now)).text();
}

describe('Sauvegarde complète', () => {
  it('porte un format et un numéro de version, et un nom de fichier daté', async () => {
    await fillPhone();
    const data = JSON.parse(await backupText());
    expect(data).toMatchObject({ format: 'dis-moi/sauvegarde', version: BACKUP_VERSION });
    expect(data.customGames[0]).toMatchObject({ format: 'dis-moi/jeu', name: 'Devinettes de Léa' });
    expect(backupFileName(new Date(2026, 10, 5).getTime())).toBe(
      'dis-moi-2026-11-05.dismoi-sauvegarde.json',
    );
  });

  it('restaurée sur un appareil vierge, redonne tout à l’identique', async () => {
    await fillPhone();
    const before = await snapshot();
    const createdAt = Date.UTC(2026, 10, 25);
    const text = await backupText(createdAt);

    await Promise.all(TABLES.map((t) => t.clear()));
    await loadSettings();
    await restoreBackup(parseBackup(text), 'replace');

    const after = await snapshot();
    expect(after.players).toEqual(before.players);
    expect(after.games).toEqual(before.games);
    expect(after.customGames).toEqual(before.customGames);
    expect(getSettings()).toMatchObject({
      theme: 'night',
      rounds: 15,
      catalogue: ['devinette'],
      lastBackupAt: createdAt,
    });
  });

  it('« Tout remplacer » efface ce qui était sur le téléphone', async () => {
    await fillPhone();
    const text = await backupText();
    await addPlayer('Noé');
    await createCustomGame('Autre jeu', 'draw');
    await restoreBackup(parseBackup(text), 'replace');
    expect((await db.players.toArray()).map((p) => p.name)).toEqual(['Léa', 'Sami']);
    expect(await db.customGames.count()).toBe(1);
  });

  it('garde les avatars, et en donne un aux joueurs d’une sauvegarde plus ancienne', async () => {
    const id = await addPlayer('Léa', { animal: 'hibou', color: 'lilac' });
    await addPlayer('Sami');
    const text = await backupText();
    await db.players.clear();
    await restoreBackup(parseBackup(text), 'merge');
    expect((await db.players.toArray()).find((p) => p.name === 'Léa')).toMatchObject({
      animal: 'hibou',
      color: 'lilac',
    });

    const data = JSON.parse(text);
    for (const p of data.players) delete p.animal;
    await restoreBackup(parseBackup(JSON.stringify(data)), 'replace');
    const players = await db.players.toArray();
    expect(players.map((p) => p.animal)).toEqual(['renard', 'ours']);
    expect(players[0]).toMatchObject({ id, color: 'lilac' });
  });

  describe('fichier refusé, sans rien modifier', () => {
    const cases: [string, (text: string) => string, RegExp][] = [
      ['pas du JSON', () => 'coucou', /pas une sauvegarde/],
      ['un jeu seul', () => JSON.stringify({ format: 'dis-moi/jeu', version: 1 }), /pas une/],
      [
        'version plus récente',
        (t) => JSON.stringify({ ...JSON.parse(t), version: BACKUP_VERSION + 1 }),
        /plus récente/,
      ],
      [
        'joueur abîmé',
        (t) => JSON.stringify({ ...JSON.parse(t), players: [{ id: 1, name: 42 }] }),
        /pas une/,
      ],
      [
        'partie abîmée',
        (t) => JSON.stringify({ ...JSON.parse(t), games: [{ id: 1, gameId: 'x' }] }),
        /pas une/,
      ],
      [
        'jeu créé abîmé',
        (t) => {
          const data = JSON.parse(t);
          data.customGames[0].kind = 'inconnu';
          return JSON.stringify(data);
        },
        /Devinettes de Léa/,
      ],
      [
        'identifiants en double',
        (t) => {
          const data = JSON.parse(t);
          data.players[1].id = data.players[0].id;
          return JSON.stringify(data);
        },
        /pas une/,
      ],
    ];
    for (const [name, corrupt, message] of cases)
      it(name, async () => {
        await fillPhone();
        const text = corrupt(await backupText());
        const before = await snapshot();
        await expect(readBackupFile(new Blob([text]))).rejects.toThrow(message);
        expect(await snapshot()).toEqual(before);
      });

    it('trop gros', async () => {
      const huge = { size: MAX_BACKUP_SIZE + 1, text: () => Promise.resolve('{}') } as Blob;
      await expect(readBackupFile(huge)).rejects.toThrow('trop gros');
    });
  });

  describe('Fusionner', () => {
    it('ajoute sans doublon et garde les réglages du téléphone', async () => {
      await fillPhone();
      const text = await backupText();
      // Autre téléphone : Léa existe déjà (autre casse), réglages différents, même nom de jeu.
      await Promise.all(TABLES.map((t) => t.clear()));
      await loadSettings();
      const lea = await addPlayer('LÉA');
      await setSetting('rounds', 5);
      await setSetting('catalogue', ['catalogue-animaux']);
      await createCustomGame('Devinettes de Léa', 'draw');

      await restoreBackup(parseBackup(text), 'merge');
      const players = await db.players.toArray();
      expect(players.map((p) => p.name)).toEqual(['LÉA', 'Sami']);
      const sami = players[1].id;
      const games = await db.games.toArray();
      expect(games).toHaveLength(2);
      expect(games[0].playerIds).toEqual([lea, sami]);
      expect((await db.customGames.toArray()).map((g) => g.name)).toEqual([
        'Devinettes de Léa',
        'Devinettes de Léa (2)',
      ]);
      expect(getSettings()).toMatchObject({
        rounds: 5,
        theme: 'auto',
        catalogue: ['catalogue-animaux', 'devinette'],
      });

      // La même sauvegarde une seconde fois n'ajoute rien.
      const once = await snapshot();
      await restoreBackup(parseBackup(text), 'merge');
      expect(await snapshot()).toEqual(once);
    });

    it('refuse de dépasser 6 joueurs, sans rien modifier', async () => {
      await fillPhone();
      const text = await backupText();
      await Promise.all(TABLES.map((t) => t.clear()));
      for (const name of ['A', 'B', 'C', 'D', 'E']) await addPlayer(name);
      const before = await snapshot();
      await expect(restoreBackup(parseBackup(text), 'merge')).rejects.toThrow('6 joueurs');
      expect(await snapshot()).toEqual(before);
    });
  });
});

describe('Rappel de sauvegarde', () => {
  const day = 24 * 3600 * 1000;
  const now = Date.UTC(2026, 10, 25);
  it('seulement s’il y a des jeux créés et pas de sauvegarde depuis 30 jours', () => {
    expect(needsBackupReminder(null, 0, now)).toBe(false);
    expect(needsBackupReminder(null, 1, now)).toBe(true);
    expect(needsBackupReminder(now - 10 * day, 1, now)).toBe(false);
    expect(needsBackupReminder(now - 31 * day, 1, now)).toBe(true);
  });
});
