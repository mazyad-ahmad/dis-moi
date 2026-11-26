// @vitest-environment node
// Environnement Node : ses Blob traversent la fausse base IndexedDB (ceux de jsdom y perdent
// leur contenu), on peut donc vérifier les images à l'identique.
import { createBackupFile, parseBackup, restoreBackup } from './backup';
import { db } from './db';
import {
  CLEANUP_COUNT,
  deleteOldestDrawings,
  DrawingError,
  drawingFileName,
  keepDrawing,
  listDrawings,
  MAX_DRAWINGS,
  updateDrawingImage,
} from './drawings';
import { addPlayer } from './players';
import { loadSettings } from './settings';

const png = (content = 'png') => new Blob([content], { type: 'image/png' });

beforeEach(async () => {
  await Promise.all([db.drawings.clear(), db.players.clear(), db.settings.clear()]);
  await loadSettings();
});

describe('Dessins gardés', () => {
  it('garde l’image, le mot, la date et l’enfant ; les plus récents d’abord', async () => {
    const lea = await addPlayer('Léa');
    await keepDrawing({ word: 'Un chat', image: png('chat'), playerIds: [lea] }, 1000);
    await keepDrawing({ word: 'Une maison', image: png('maison'), playerIds: [] }, 2000);
    const [maison, chat] = await listDrawings();
    expect(maison).toMatchObject({ word: 'Une maison', createdAt: 2000 });
    expect(chat).toMatchObject({ word: 'Un chat', playerIds: [lea], createdAt: 1000 });
    expect(await chat.image.text()).toBe('chat');
  });

  it('met à jour l’image d’un dessin déjà gardé, sans doublon', async () => {
    const id = await keepDrawing({ word: 'Un chat', image: png('avant'), playerIds: [] });
    await updateDrawingImage(id, png('après'));
    const all = await listDrawings();
    expect(all).toHaveLength(1);
    expect(await all[0].image.text()).toBe('après');
  });

  it('refuse au-delà de la limite, et le nettoyage retire les plus anciens', async () => {
    await db.drawings.bulkAdd(
      Array.from({ length: MAX_DRAWINGS }, (_, i) => ({
        word: `mot ${i}`,
        image: png(),
        playerIds: [],
        createdAt: i,
      })) as never,
    );
    await expect(keepDrawing({ word: 'de trop', image: png(), playerIds: [] })).rejects.toThrow(
      DrawingError,
    );
    await deleteOldestDrawings();
    const left = await listDrawings();
    expect(left).toHaveLength(MAX_DRAWINGS - CLEANUP_COUNT);
    expect(Math.min(...left.map((d) => d.createdAt))).toBe(CLEANUP_COUNT);
    await keepDrawing({ word: 'nouveau', image: png(), playerIds: [] });
  });

  it('nomme le fichier partagé d’après le mot et la date', () => {
    const createdAt = new Date(2026, 10, 5).getTime();
    expect(drawingFileName({ word: 'Un éléphant !', createdAt })).toBe(
      'dessin-un-elephant-2026-11-05.png',
    );
    expect(drawingFileName({ word: '?!', createdAt })).toBe('dessin-2026-11-05.png');
  });
});

describe('Dessins gardés dans la sauvegarde complète', () => {
  async function fill() {
    const lea = await addPlayer('Léa');
    await keepDrawing({ word: 'Un chat', image: png('chat'), playerIds: [lea] }, 1000);
    return lea;
  }

  it('« Tout remplacer » redonne les dessins à l’identique', async () => {
    await fill();
    const before = await db.drawings.toArray();
    const backup = parseBackup(await (await createBackupFile()).text());
    expect(backup.drawings).toHaveLength(1);

    await Promise.all([db.drawings.clear(), db.players.clear()]);
    await restoreBackup(backup, 'replace');
    const after = await db.drawings.toArray();
    const meta = (list: typeof after) => list.map((d) => ({ ...d, image: undefined }));
    expect(meta(after)).toEqual(meta(before));
    expect(after[0].image.type).toBe('image/png');
    expect(await after[0].image.text()).toBe('chat');
  });

  it('« Fusionner » ajoute sans doublon et suit le prénom de l’enfant', async () => {
    await fill();
    const backup = parseBackup(await (await createBackupFile()).text());
    await restoreBackup(backup, 'merge');
    expect(await db.drawings.count()).toBe(1);

    await Promise.all([db.drawings.clear(), db.players.clear()]);
    await addPlayer('Sami');
    const lea = await addPlayer('Léa');
    await restoreBackup(backup, 'merge');
    const [drawing] = await db.drawings.toArray();
    expect(drawing.playerIds).toEqual([lea]);
  });

  it('une sauvegarde d’avant la galerie se lit encore ; une image invalide est refusée', async () => {
    await fill();
    const data = JSON.parse(await (await createBackupFile()).text());
    const old = { ...data };
    delete old.drawings;
    expect(parseBackup(JSON.stringify(old)).drawings).toEqual([]);
    data.drawings[0].image = 'data:text/html;base64,PGI+';
    expect(() => parseBackup(JSON.stringify(data))).toThrow();
  });
});
