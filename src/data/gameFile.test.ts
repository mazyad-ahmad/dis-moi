import { addItem, createCustomGame, listCustomGames, MAX_ITEMS } from './customGames';
import { db, type CustomGame } from './db';
import { gameFileName, gameToFile, importGameFile, parseGameFile } from './gameFile';

beforeEach(async () => {
  await db.customGames.clear();
});

const fileOf = (content: unknown) => new Blob([JSON.stringify(content)]);
const base = { format: 'dis-moi/jeu', version: 1, name: 'Jeu', kind: 'question' };

// fake-indexeddb ne garde pas les Blob de jsdom : les médias sont vérifiés hors de la base
// (et dans le vrai navigateur par les tests e2e).
const game = (kind: CustomGame['kind'], items: CustomGame['items']): CustomGame => ({
  id: 1,
  name: 'Ma maison',
  kind,
  items,
  createdAt: 0,
  updatedAt: 0,
});

it('exporte puis relit un jeu avec ses photos', async () => {
  const photo = new Blob([new Uint8Array([0, 1, 2, 250, 255])], { type: 'image/png' });
  const file = await gameToFile(
    game('image', [
      { answer: 'La cuisine', image: photo, hint: 'On y mange' },
      { answer: 'Pomme', text: '🍎' },
    ]),
  );
  expect(file.name).toBe('ma-maison.dismoi.json');

  const copy = parseGameFile(await file.text());
  expect(copy).toMatchObject({ name: 'Ma maison', kind: 'image' });
  expect(copy.items[0]).toMatchObject({ answer: 'La cuisine', hint: 'On y mange' });
  expect(copy.items[0].image!.type).toBe('image/png');
  expect([...new Uint8Array(await copy.items[0].image!.arrayBuffer())]).toEqual([
    0, 1, 2, 250, 255,
  ]);
  expect(copy.items[1]).toEqual({ answer: 'Pomme', text: '🍎' });
});

it('exporte puis relit un son', async () => {
  const audio = new Blob(['vroum'], { type: 'audio/webm' });
  const file = await gameToFile(game('sound', [{ answer: 'Voiture', audio }]));
  const copy = parseGameFile(await file.text());
  expect(copy.items[0].audio!.type).toBe('audio/webm');
  expect(await copy.items[0].audio!.text()).toBe('vroum');
});

it('importe un fichier comme un nouveau jeu', async () => {
  const id = await createCustomGame('Devinettes', 'question');
  await addItem(id, { text: 'Qui miaule ?', answer: 'Le chat' });
  const [original] = await listCustomGames();
  const newId = await importGameFile(await gameToFile(original));
  expect(newId).not.toBe(id);
  expect(await db.customGames.get(newId)).toMatchObject({
    name: 'Devinettes (2)',
    kind: 'question',
    items: [{ text: 'Qui miaule ?', answer: 'Le chat' }],
  });
});

it('numérote un nom déjà pris sans dépasser 30 caractères', async () => {
  const long = 'A'.repeat(30);
  await createCustomGame(long, 'draw');
  const file = fileOf({ ...base, kind: 'draw', name: long, items: [{ answer: 'chat' }] });
  const id1 = await importGameFile(file);
  const id2 = await importGameFile(file);
  expect((await db.customGames.get(id1))!.name).toBe(`${'A'.repeat(26)} (2)`);
  expect((await db.customGames.get(id2))!.name).toBe(`${'A'.repeat(26)} (3)`);
});

describe('parseGameFile refuse les fichiers invalides', () => {
  const check = (content: unknown, message: string | RegExp) =>
    expect(() =>
      parseGameFile(typeof content === 'string' ? content : JSON.stringify(content)),
    ).toThrow(message);

  it('format, version, type et cartes', () => {
    check('pas du json', 'pas un jeu Dis-moi');
    check({ ...base, format: 'autre' }, 'pas un jeu Dis-moi');
    check({ ...base, version: 2, items: [] }, /version plus récente/);
    check({ ...base, kind: 'video', items: [] }, 'pas un jeu Dis-moi');
    check({ ...base, items: 'x' }, 'pas un jeu Dis-moi');
    check({ ...base, name: ' ', items: [] }, 'Donne un nom au jeu.');
    check({ ...base, items: [{ text: 'Qui ?', answer: 3 }] }, 'pas un jeu Dis-moi');
    check({ ...base, items: [{ answer: 'Moi' }] }, 'Écris la question.');
    check(
      {
        ...base,
        kind: 'draw',
        items: Array.from({ length: MAX_ITEMS + 1 }, () => ({ answer: 'x' })),
      },
      `${MAX_ITEMS} cartes maximum.`,
    );
  });

  it('médias : seulement des images et des sons en base64', () => {
    const img = { ...base, kind: 'image' };
    check({ ...img, items: [{ answer: 'x', image: 'https://exemple.fr/a.png' }] }, 'pas un jeu');
    check({ ...img, items: [{ answer: 'x', image: 'data:text/html;base64,PGI+' }] }, 'pas un jeu');
    check({ ...img, items: [{ answer: 'x', image: 'data:image/png;base64,@@@' }] }, 'pas un jeu');
    const snd = { ...base, kind: 'sound' };
    check({ ...snd, items: [{ answer: 'x', audio: 'data:image/png;base64,AA==' }] }, 'pas un jeu');
  });

  it('ignore les champs qui ne servent pas au type', () => {
    const game = parseGameFile(
      JSON.stringify({ ...base, kind: 'draw', items: [{ answer: ' chat ', hint: 'x', image: 1 }] }),
    );
    expect(game).toEqual({ name: 'Jeu', kind: 'draw', items: [{ answer: 'chat' }] });
  });
});

it('nomme le fichier d’après le jeu', () => {
  expect(gameFileName('Devinettes de Léa !')).toBe('devinettes-de-lea.dismoi.json');
  expect(gameFileName('🍎')).toBe('jeu.dismoi.json');
});

it('garde les visuels intégrés (emoji, couleur) des cartes image, et refuse une couleur invalide', () => {
  const copy = parseGameFile(
    JSON.stringify({
      ...base,
      kind: 'image',
      items: [
        { answer: 'Rouge', color: '#D7263D' },
        { answer: 'Chat', emoji: '🐈' },
        { answer: 'Bleu', color: 'blue', text: 'Bleu' },
      ],
    }),
  );
  expect(copy.items).toEqual([
    { answer: 'Rouge', color: '#d7263d' },
    { answer: 'Chat', emoji: '🐈' },
    { answer: 'Bleu', text: 'Bleu' },
  ]);
});
