import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import credits from './media/credits.json';
import { deckItems, getPack, MEDIA, validatePack, type Pack } from './packs';

/**
 * Vrais cris et photos des jeux intégrés (#118) : fichiers libres, crédités, légers.
 */

const DIR = join(import.meta.dirname, 'media');
const files = readdirSync(DIR).filter((f) => f !== 'credits.json');

/** Licences acceptées : domaine public de préférence, sinon licences libres créditées. */
const LICENSES = [
  'CC0 1.0',
  'Domaine public',
  'Marque du domaine public 1.0',
  'CC BY 4.0',
  'CC BY-SA 4.0',
];

describe('sons et photos embarqués', () => {
  it('chaque fichier a sa source et sa licence, et chaque crédit son fichier', () => {
    expect(credits.map((c) => c.file).sort()).toEqual([...files].sort());
    for (const c of credits) {
      expect(c.title, c.file).toBeTruthy();
      expect(c.author, c.file).toBeTruthy();
      expect(c.source, c.file).toMatch(/^https:\/\//);
      expect(LICENSES, c.file).toContain(c.license);
      expect(['son', 'photo'], c.file).toContain(c.kind);
    }
  });

  it('pèsent moins de 3 Mo en tout (appli hors ligne)', () => {
    const total = files.reduce((sum, f) => sum + statSync(join(DIR, f)).size, 0);
    expect(total).toBeLessThan(3 * 1024 * 1024);
  });

  it('sont tous embarqués dans le build', () => {
    expect(Object.keys(MEDIA).sort()).toEqual([...files].sort());
  });

  it('chaque animal de « Quel animal ? » a un cri enregistré et une photo', () => {
    for (const item of deckItems(getPack('animal'))) {
      expect(item.soundUrl, item.answer).toBeTruthy();
      expect(item.photoUrl, item.answer).toBeTruthy();
      expect(item).not.toHaveProperty('sound');
      expect(item).not.toHaveProperty('photo');
    }
  });
});

describe('format de pack : son et photo d’une carte', () => {
  const animals = getPack('animal');
  const withFirst = (change: object): Pack => ({
    ...animals,
    items: animals.items.map((it, i) => (i === 0 ? { ...it, ...change } : it)),
  });

  it.each([
    [{ sound: 'absent.wav' }, 'son (« sound ») introuvable dans src/content/media/'],
    [{ sound: 'vache.webp' }, 'son (« sound ») introuvable'],
    [{ photo: 'absente.webp' }, 'photo (« photo ») introuvable'],
    [{ photo: 'vache.wav' }, 'photo (« photo ») introuvable'],
  ])('%o est refusé', (change, message) => {
    expect(() => validatePack(withFirst(change), 'test.json')).toThrow(
      `carte 1 (« La vache ») : ${message}`,
    );
  });

  it('le son est réservé aux packs de sons', () => {
    const colors = getPack('couleur');
    const pack = { ...colors, items: [{ ...colors.items[0], sound: 'vache.wav' }] };
    expect(() => validatePack(pack, 'test.json')).toThrow(
      '« sound » est réservé aux packs de sons',
    );
  });

  it('une carte sans fichier reste valide', () => {
    const plain = withFirst({ sound: undefined, photo: undefined });
    expect(() => validatePack(plain, 'test.json')).not.toThrow();
    expect(deckItems(plain)[0]).not.toHaveProperty('soundUrl');
  });
});
