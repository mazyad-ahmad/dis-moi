import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { PACK_FILES, type Pack } from '../content/packs';
import { MAX_PROLONGER } from '../data/customGames';
import { db } from '../data/db';
import { loadSettings } from '../data/settings';

// #124 : une phrase pour prolonger la discussion, montrée au parent après la réponse.

beforeEach(async () => {
  await Promise.all([db.settings.clear(), db.games.clear(), db.customGames.clear()]);
  await loadSettings();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const parent = () => screen.getByRole('region', { name: 'Pour le parent' });

// Jeux enrichis par #124. Les jeux arrivés ensuite (lot M8) n'ont pas encore de phrase.
const WITH_PHRASES = [
  'chansons',
  'lettres',
  'chiffres',
  'nombres',
  'des',
  'doigts',
  'dessin',
  'catalogue-animal',
  'catalogue-couleur',
  'catalogue-mime',
  'catalogue-devinette',
];

describe('phrases « prolonger » du contenu intégré', () => {
  const files = Object.entries(PACK_FILES).filter(([path]) =>
    WITH_PHRASES.includes(path.replace(/^\.\/|\.json$/g, '')),
  );
  const items = files.flatMap(([, raw]) => (raw as Pack).items);

  it('couvrent les jeux prévus', () => {
    expect(files).toHaveLength(WITH_PHRASES.length);
  });

  it('au moins la moitié des cartes intégrées en a une', () => {
    const withPhrase = items.filter((it) => it.prolonger);
    expect(withPhrase.length * 2).toBeGreaterThanOrEqual(items.length);
  });

  it('toutes les cartes des petits des jeux du catalogue en ont une', () => {
    const catalogue = files
      .filter(([path]) => path.startsWith('./catalogue-'))
      .flatMap(([, raw]) => (raw as Pack).items);
    expect(catalogue.filter((it) => it.level === 1 && !it.prolonger)).toEqual([]);
  });

  it('restent courtes', () => {
    for (const it of items)
      if (it.prolonger) expect(it.prolonger.length).toBeLessThanOrEqual(MAX_PROLONGER);
  });
});

describe('dans le bloc « Pour le parent »', () => {
  it('jeu du catalogue : seulement après « Voir la réponse »', async () => {
    const user = userEvent.setup();
    open('/jeu/devinette');
    expect(await screen.findByText(/^Manche 1/)).toBeInTheDocument();
    expect(within(parent()).queryByText('Pour prolonger :')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
    expect(within(parent()).getByText('Pour prolonger :').parentElement).toHaveTextContent(
      /^Pour prolonger : \S/,
    );
  });

  it('Quelle lettre : visible d’emblée, la lettre est déjà à l’écran', async () => {
    open('/jeu/lettres');
    expect(await screen.findByText(/^Manche 1/)).toBeInTheDocument();
    expect(within(parent()).getByText('Pour prolonger :')).toBeInTheDocument();
  });

  it('se rédige dans le formulaire de carte d’un jeu créé', async () => {
    const user = userEvent.setup();
    open('/ajouter');
    await user.type(screen.getByLabelText('Nom du jeu'), 'La maison');
    await user.click(screen.getByLabelText('Question'));
    await user.click(screen.getByRole('button', { name: 'Ajouter les questions' }));
    expect(await screen.findByRole('heading', { name: 'La maison' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Question'), 'Qui fait « toc toc » ?');
    await user.type(screen.getByLabelText('Réponse'), 'La porte');
    const field = screen.getByLabelText('Pour prolonger (facultatif)');
    expect(field).toHaveAttribute('maxLength', String(MAX_PROLONGER));
    await user.type(field, 'Comptez ensemble les portes de la maison');
    await user.click(screen.getByRole('button', { name: 'Ajouter la carte' }));
    expect(await screen.findByText('1 carte')).toBeInTheDocument();
    const [game] = await db.customGames.toArray();
    expect(game.items[0].prolonger).toBe('Comptez ensemble les portes de la maison');

    await user.click(screen.getByRole('link', { name: 'Jouer' }));
    expect(await screen.findByText('Manche 1 sur 1')).toBeInTheDocument();
    expect(parent()).not.toHaveTextContent('Comptez ensemble');
    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }));
    expect(parent()).toHaveTextContent('Pour prolonger : Comptez ensemble les portes de la maison');
  });

  it('pas de champ pour un jeu de mots à dessiner', async () => {
    const user = userEvent.setup();
    open('/ajouter');
    await user.type(screen.getByLabelText('Nom du jeu'), 'Mes mots');
    await user.click(screen.getByLabelText('Mot à dessiner'));
    await user.click(screen.getByRole('button', { name: /Ajouter les/ }));
    expect(await screen.findByRole('heading', { name: 'Mes mots' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Pour prolonger (facultatif)')).not.toBeInTheDocument();
  });
});
