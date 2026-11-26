import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { findCatalogueGame } from '../catalogue/catalogue';
import { suitsMode } from '../modes';
import { consigneOf, JACQUES_ID } from './consigne';

// #57 : Jacques a dit, jeu de mouvement du catalogue.

const game = findCatalogueGame(JACQUES_ID)!;
const traps = game.items.filter((i) => consigneOf(i) === 'piege');

describe('Jacques a dit : le pack', () => {
  it('50 consignes, un tiers de pièges, à chaque niveau', () => {
    expect(game.items).toHaveLength(50);
    expect(traps).toHaveLength(17);
    for (const level of [1, 2, 3]) {
      const cards = game.items.filter((i) => i.level === level);
      const trapped = cards.filter((i) => consigneOf(i) === 'piege').length;
      expect(trapped / cards.length).toBeGreaterThan(0.29);
      expect(trapped / cards.length).toBeLessThan(0.37);
    }
  });

  it('« Jacques a dit » en tête des consignes à faire, jamais dans les pièges', () => {
    for (const item of game.items) {
      expect(consigneOf(item)).toBeDefined();
      if (consigneOf(item) === 'piege') expect(item.text).not.toMatch(/jacques/i);
      else expect(item.text).toMatch(/^Jacques a dit : \S/);
      expect(item.text).toMatch(/\.$/);
    }
  });

  it('rien de dangereux ni d’impossible en appartement', () => {
    const risky =
      /\b(cours|courir|saute|sauter|grimpe|monte|escalade|lance|jette|roulade|cri[es]?|hurle|dehors|fenêtre|escalier|canapé|lit|table|chaise|plafond)\b/i;
    for (const item of game.items) expect(item.text).not.toMatch(risky);
  });

  it('fait bouger : écarté au Coucher et en Voiture', () => {
    expect(game.kind).toBe('question');
    expect(game.needs.moves).toBe(true);
    expect(suitsMode(game.needs, 'normal')).toBe(true);
    expect(suitsMode(game.needs, 'coucher')).toBe(false);
    expect(suitsMode(game.needs, 'voiture')).toBe(false);
  });
});

describe('sorte de consigne d’une carte', () => {
  it('d’après son thème, seulement pour ce jeu', () => {
    expect(consigneOf({ tags: ['piege'] })).toBe('piege');
    expect(consigneOf({ tags: ['jacques-a-dit'] })).toBe('jacques-a-dit');
    expect(consigneOf({ tags: ['ferme'] })).toBeUndefined();
    expect(consigneOf({})).toBeUndefined();
  });
});

describe('Jacques a dit, en jeu', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
    await loadSettings();
    await setSetting('catalogue', [JACQUES_ID]);
  });

  function open(path: string) {
    window.location.hash = `#${path}`;
    return render(<App />);
  }

  it('le parent voit d’emblée si c’est un piège, sans réponse à dévoiler', async () => {
    const user = userEvent.setup();
    open('/jeu/jacques');
    for (let round = 1; round <= 3; round++) {
      const card = await screen.findByRole('region', { name: 'Question' });
      const said = within(card).getByText(/\.$/).textContent!;
      const item = game.items.find((i) => i.text === said)!;
      const parent = screen.getByRole('region', { name: 'Pour le parent' });
      if (consigneOf(item) === 'piege') {
        expect(within(parent).getByText('Piège !')).toBeInTheDocument();
        expect(parent).toHaveTextContent('Une étoile s’il reste immobile.');
      } else {
        expect(within(parent).getByText('Jacques a dit')).toBeInTheDocument();
        expect(parent).toHaveTextContent('Une étoile s’il le fait.');
      }
      expect(screen.queryByRole('button', { name: 'Voir la réponse' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /indice/i })).not.toBeInTheDocument();
      // Un seul geste par manche : on enchaîne.
      await user.click(screen.getByRole('button', { name: round % 2 ? 'Trouvé' : 'Pas encore' }));
      expect(screen.getByText(`Manche ${round + 1} sur 10`)).toBeInTheDocument();
    }
  });

  it('pas de choix à montrer : l’enfant répond avec son corps', async () => {
    await setSetting('showChoices', true);
    open('/jeu/jacques');
    expect(await screen.findByRole('region', { name: 'Question' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Choix de l’enfant' })).not.toBeInTheDocument();
  });
});
