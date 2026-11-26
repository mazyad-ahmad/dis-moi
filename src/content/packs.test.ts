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
      'source d’un air manquante',
      withItem(songs, 2, { source: undefined }),
      'carte 3 (« Ah ! vous dirai-je, maman ») : source (« source ») manquante',
    ],
    [
      'thème d’un air manquant',
      withItem(songs, 0, { tags: ['ferme'] }),
      'carte 1 (« Frère Jacques ») : thème (« tags ») : un seul parmi comptine, noel, classique',
    ],
    [
      'thème d’un mot à dessiner manquant',
      withItem(getPack('dessin'), 0, { tags: undefined }),
      'carte 1 (« Un ver de terre ») : thème (« tags ») : un seul parmi animaux, maison, nature',
    ],
    [
      'deux thèmes pour un mot à dessiner',
      withItem(getPack('dessin'), 0, { tags: ['animaux', 'nature'] }),
      'carte 1 (« Un ver de terre ») : thème (« tags ») : un seul parmi',
    ],
    [
      'source hors d’un pack d’airs',
      withItem(animals, 0, { source: 'Traditionnel' }),
      'carte 1 (« La vache ») : « melody », « bpm » et « source »',
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
    [
      'indices pas en liste',
      withItem(animals, 0, { hints: 'Elle est noire et blanche' }),
      'carte 1 (« La vache ») : indices (« hints »)',
    ],
    ['niveau hors limites', withItem(animals, 0, { level: 4 }), 'carte 1 (« La vache ») : niveau'],
    [
      'niveau manquant',
      withItem(animals, 1, { level: undefined }),
      'carte 2 (« Le chat ») : niveau (« level ») manquant : 1 (Petits, 3-4 ans)',
    ],
    [
      'couleur invalide',
      withItem(getPack('couleur'), 0, { color: 'red' }),
      'carte 1 (« Rouge ») : couleur invalide',
    ],
    [
      'glyphe trop long',
      withItem(getPack('nombres'), 0, { answer: '1000' }),
      'carte 1 (« 1000 ») : un glyphe fait 1 à 3 caractères',
    ],
    [
      'phrase « prolonger » trop longue',
      withItem(animals, 0, { prolonger: 'Demande-lui '.repeat(10).trim() }),
      'carte 1 (« La vache ») : « prolonger » vide, trop long (100 max) ou mal espacé',
    ],
    [
      'phrase « prolonger » vide',
      withItem(animals, 1, { prolonger: '' }),
      'carte 2 (« Le chat ») : « prolonger » vide',
    ],
    [
      'phrase « prolonger » pour un mot à dessiner',
      withItem(getPack('dessin'), 0, { prolonger: 'Demande-lui sa couleur.' }),
      '« prolonger » n’est pas montré pour un mot à dessiner',
    ],
    ['type inconnu', { ...animals, kind: 'video' }, 'type (« kind ») inconnu'],
    ['type de jeu inconnu', { ...animals, activities: ['nager'] }, '« activities »'],
    ['type de jeu en double', { ...animals, activities: ['parler', 'parler'] }, '« activities »'],
    ['aucun type de jeu', { ...animals, activities: [] }, '« activities »'],
    ['format', { ...animals, format: 'autre' }, '« format » doit valoir'],
  ];
  it.each(cases)('%s', (_, pack, message) => {
    expect(() => validatePack(JSON.parse(JSON.stringify(pack)), 'test.json')).toThrow(PackError);
    expect(() => validatePack(JSON.parse(JSON.stringify(pack)), 'test.json')).toThrow(message);
  });

  it('accepte les champs facultatifs de thèmes et de langue', () => {
    const pack = withItem(animals, 0, { level: 3, tags: ['ferme'], lang: 'fr' });
    expect(() => validatePack(pack, 'test.json')).not.toThrow();
  });
});
