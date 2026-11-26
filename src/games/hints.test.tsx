import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { addItem, createCustomGame } from '../data/customGames';
import { db } from '../data/db';
import { firstLetter, firstLetterHint, hintLadder, writtenHints } from './hints';

beforeEach(async () => {
  await Promise.all([db.settings.clear(), db.games.clear(), db.customGames.clear()]);
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const parent = () => screen.getByRole('region', { name: 'Pour le parent' });
const hintLines = () =>
  within(parent())
    .queryAllByText(/^Indice :/)
    .map((p) => p.textContent);

describe('indices générés', () => {
  it.each([
    ['La vache', 'V'],
    ['L’éléphant', 'É'],
    ["l'horloge", 'H'],
    ['Les chaussures', 'C'],
    ['Frère Jacques', 'F'],
    ['Au clair de la lune', 'A'],
    ['Ah ! vous dirai-je, maman', 'A'],
    ['« Zèbre »', 'Z'],
    ['La', 'L'],
    ['7 nains', '7'],
  ])('première lettre de « %s » : %s', (answer, letter) => {
    expect(firstLetter(answer)).toBe(letter);
  });

  it('pas d’indice de lettre sans lettre', () => {
    expect(firstLetterHint('🍎')).toBeUndefined();
    expect(firstLetterHint('Pomme')).toBe('Ça commence par « P »');
  });

  it('échelle : indices écrits puis première lettre, sans doublon', () => {
    expect(
      hintLadder({ answer: 'Le soleil', hint: 'Il brille', hints: ['Il chauffe', 'Il brille'] }),
    ).toEqual(['Il brille', 'Il chauffe', 'Ça commence par « S »']);
    expect(hintLadder({ answer: 'La porte' })).toEqual(['Ça commence par « P »']);
    expect(writtenHints({ hint: '  ', hints: [] })).toEqual([]);
  });
});

describe('Encore un indice', () => {
  it('jeu à cartes sans indice écrit : la première lettre, jamais la réponse, étoile gardée', async () => {
    const user = userEvent.setup();
    const id = await createCustomGame('Maison', 'question');
    await addItem(id, { text: 'Qui fait « toc toc » ?', answer: 'La porte' });
    open(`/jeu/perso-${id}`);

    expect(await screen.findByText('Manche 1 sur 1')).toBeInTheDocument();
    expect(hintLines()).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Un indice' }));
    expect(hintLines()).toEqual(['Indice : Ça commence par « P »']);
    // Plus d'indice à donner : le bouton disparaît, la réponse reste cachée.
    expect(screen.queryByRole('button', { name: /indice/i })).not.toBeInTheDocument();
    expect(parent()).not.toHaveTextContent('La porte');
    expect(screen.getByRole('button', { name: 'Voir la réponse' })).toBeInTheDocument();

    // Pas de pénalité : l'étoile est gagnée malgré l'indice.
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(
      screen.getByRole('heading', { name: '1 étoile gagnées ensemble !' }),
    ).toBeInTheDocument();
    await waitFor(async () => expect(await db.games.toArray()).toMatchObject([{ stars: 1 }]));
  });

  it('jeu à cartes avec indices écrits : un indice de plus à chaque appui', async () => {
    const user = userEvent.setup();
    const id = await createCustomGame('Maison', 'question');
    await addItem(id, {
      text: 'Qui sonne le matin ?',
      answer: 'Le réveil',
      hint: 'Il est sur la table de nuit',
      hints: ['Il fait « dring »'],
    });
    open(`/jeu/perso-${id}`);

    expect(await screen.findByText('Manche 1 sur 1')).toBeInTheDocument();
    expect(hintLines()).toEqual(['Indice : Il est sur la table de nuit']);
    await user.click(screen.getByRole('button', { name: 'Encore un indice' }));
    expect(hintLines()).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Encore un indice' }));
    expect(hintLines()).toEqual([
      'Indice : Il est sur la table de nuit',
      'Indice : Il fait « dring »',
      'Indice : Ça commence par « R »',
    ]);
    expect(screen.queryByRole('button', { name: /indice/i })).not.toBeInTheDocument();
    expect(parent()).not.toHaveTextContent('Le réveil');
  });

  it('Quelle chanson : indice écrit, air ralenti, première lettre, puis nouvelle manche', async () => {
    const user = userEvent.setup();
    open('/jeu/chanson');

    expect(hintLines()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Écouter l’extrait' })).toBeInTheDocument();

    // Indices écrits éventuels, puis l'air ralenti.
    while (!screen.queryByRole('button', { name: 'Écouter l’extrait ralenti' }))
      await user.click(screen.getByRole('button', { name: 'Encore un indice' }));
    expect(hintLines().at(-1)).toBe('Indice : l’air passe au ralenti, fais-le réécouter');

    await user.click(screen.getByRole('button', { name: 'Encore un indice' }));
    expect(hintLines().at(-1)).toMatch(/^Indice : Ça commence par « .+ »$/);
    expect(screen.queryByRole('button', { name: /indice/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voir la réponse' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    // Nouvelle manche : indices et lecteur remis à zéro.
    expect(hintLines()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Écouter l’extrait' })).toBeInTheDocument();
  });

  it('plus de nouvel indice une fois la réponse vue', async () => {
    const user = userEvent.setup();
    open('/jeu/devinette');
    expect(screen.getByRole('button', { name: 'Encore un indice' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
    expect(screen.queryByRole('button', { name: /indice/i })).not.toBeInTheDocument();
  });
});
