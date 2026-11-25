import {
  addItem,
  cleanItem,
  createCustomGame,
  customDeck,
  CustomGameError,
  deleteCustomGame,
  listCustomGames,
  MAX_ITEMS,
  parseCustomRouteId,
  removeItem,
  renameCustomGame,
  updateItem,
} from './customGames';
import { db } from './db';

beforeEach(async () => {
  await db.customGames.clear();
});

describe('cleanItem', () => {
  const audio = new Blob(['x'], { type: 'audio/webm' });
  const image = new Blob(['x'], { type: 'image/jpeg' });

  it('demande les champs utiles à chaque type', () => {
    expect(() => cleanItem('question', { answer: 'Le chat' })).toThrow('Écris la question.');
    expect(() => cleanItem('question', { text: 'Qui ?', answer: ' ' })).toThrow(
      'Écris la réponse.',
    );
    expect(() => cleanItem('draw', { answer: '' })).toThrow('Écris le mot à dessiner.');
    expect(() => cleanItem('image', { answer: 'Pomme' })).toThrow(/photo ou un texte/);
    expect(() => cleanItem('sound', { answer: 'Voiture' })).toThrow(/son ou écris le bruit/);
    expect(cleanItem('sound', { answer: 'Voiture', audio })).toEqual({ answer: 'Voiture', audio });
    expect(cleanItem('image', { answer: 'Pomme', image })).toEqual({ answer: 'Pomme', image });
  });

  it('nettoie les espaces et retire ce qui ne sert pas au type', () => {
    expect(
      cleanItem('draw', { answer: '  un   chat ', text: 'x', hint: 'y', image, audio }),
    ).toEqual({ answer: 'un chat' });
    expect(cleanItem('question', { text: ' Qui ? ', answer: 'Moi', hint: '  ' })).toEqual({
      text: 'Qui ?',
      answer: 'Moi',
    });
  });
});

it('crée, modifie et supprime un jeu et ses cartes', async () => {
  await expect(createCustomGame('  ', 'question')).rejects.toThrow(CustomGameError);
  const id = await createCustomGame(' Mes   devinettes ', 'question');
  await addItem(id, { text: 'Qui miaule ?', answer: 'Le chat' });
  await addItem(id, { text: 'Qui aboie ?', answer: 'Le chien', hint: 'Il remue la queue' });
  await expect(addItem(id, { text: 'Vide', answer: '' })).rejects.toThrow('Écris la réponse.');
  await updateItem(id, 0, { text: 'Qui miaule ?', answer: 'Le chaton' });
  await removeItem(id, 1);
  await renameCustomGame(id, 'Devinettes de Léa');

  const [game] = await listCustomGames();
  expect(game).toMatchObject({
    name: 'Devinettes de Léa',
    kind: 'question',
    items: [{ text: 'Qui miaule ?', answer: 'Le chaton' }],
  });
  expect(customDeck(game)).toMatchObject({ id: `perso-${id}`, mark: 'D', category: 'Mon jeu' });

  await deleteCustomGame(id);
  expect(await listCustomGames()).toEqual([]);
});

it(`limite un jeu à ${MAX_ITEMS} cartes`, async () => {
  const id = await createCustomGame('Dessins', 'draw');
  for (let i = 0; i < MAX_ITEMS; i++) await addItem(id, { answer: `mot ${i}` });
  await expect(addItem(id, { answer: 'de trop' })).rejects.toThrow(`${MAX_ITEMS} cartes maximum.`);
});

it('lit les identifiants de route', () => {
  expect(parseCustomRouteId('perso-12')).toBe(12);
  expect(parseCustomRouteId('perso-0')).toBeUndefined();
  expect(parseCustomRouteId('perso-x')).toBeUndefined();
  expect(parseCustomRouteId('chanson')).toBeUndefined();
});
