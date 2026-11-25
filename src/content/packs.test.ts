import { parseGameFile } from '../data/gameFile';
import { DECK_KINDS } from '../games/deck/types';
import { getPack, PACK_FILES, PackError, validatePack, type Pack } from './packs';

const files = Object.entries(PACK_FILES).map(([path, raw]) => [path.slice(2), raw] as const);

describe('packs de src/content', () => {
  it.each(files)('%s est valide', (file, raw) => {
    const pack = validatePack(raw, file);
    // Nom de fichier : <id>.json, ou catalogue-<id>.json pour les jeux du catalogue.
    expect([`${pack.id}.json`, `catalogue-${pack.id}.json`]).toContain(file);
  });

  it('ont des identifiants uniques', () => {
    const ids = files.map(([, raw]) => (raw as Pack).id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('les packs de jeux à cartes s’importent comme un fichier de jeu partagé', () => {
    const decks = files
      .map(([, raw]) => raw as Pack)
      .filter((p) => DECK_KINDS.some((k) => k.value === p.kind));
    expect(decks.length).toBeGreaterThanOrEqual(5);
    for (const pack of decks) {
      // Les fichiers de jeu ont 50 cartes au plus : on vérifie le début du pack.
      const shared = parseGameFile(JSON.stringify({ ...pack, items: pack.items.slice(0, 50) }));
      expect(shared).toMatchObject({ name: pack.name, kind: pack.kind });
      expect(shared.items[0].answer).toBe(pack.items[0].answer);
    }
  });
});

describe('un pack invalide nomme la carte fautive', () => {
  const songs = getPack('chansons');
  const animals = getPack('animal');
  const withItem = (pack: Pack, index: number, change: object) => ({
    ...pack,
    items: pack.items.map((it, i) => (i === index ? { ...it, ...change } : it)),
  });
  const cases: [string, unknown, string][] = [
    [
      'tempo manquant',
      withItem(songs, 1, { bpm: undefined }),
      'Pack test.json : carte 2 (« Au clair de la lune ») : tempo (« bpm ») entre 40 et 240 attendu',
    ],
    [
      'air illisible',
      withItem(songs, 0, { melody: 'C4 H9' }),
      'carte 1 (« Frère Jacques ») : air illisible',
    ],
    [
      'bruit manquant',
      withItem(animals, 2, { text: undefined }),
      'carte 3 (« Le chien ») : bruit à imiter',
    ],
    [
      'champ mal écrit',
      withItem(animals, 0, { hnit: 'x' }),
      'carte 1 (« La vache ») : champ inconnu « hnit »',
    ],
    [
      'identifiant en double',
      withItem(animals, 1, { id: 'vache' }),
      'carte 2 (« Le chat ») : identifiant « vache » en double',
    ],
    ['réponse vide', withItem(animals, 0, { answer: '' }), 'carte 1 : réponse'],
    ['âge hors limites', withItem(animals, 0, { level: 12 }), 'carte 1 (« La vache ») : âge'],
    [
      'couleur invalide',
      withItem(getPack('couleur'), 0, { color: 'red' }),
      'carte 1 (« Rouge ») : couleur invalide',
    ],
    ['type inconnu', { ...animals, kind: 'video' }, 'type (« kind ») inconnu'],
    ['format', { ...animals, format: 'autre' }, '« format » doit valoir'],
  ];
  it.each(cases)('%s', (_, pack, message) => {
    expect(() => validatePack(JSON.parse(JSON.stringify(pack)), 'test.json')).toThrow(PackError);
    expect(() => validatePack(JSON.parse(JSON.stringify(pack)), 'test.json')).toThrow(message);
  });

  it('accepte les champs facultatifs d’âge, de thèmes et de langue', () => {
    const pack = withItem(animals, 0, { level: 3, tags: ['ferme'], lang: 'fr' });
    expect(() => validatePack(pack, 'test.json')).not.toThrow();
  });
});
