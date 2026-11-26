import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { findCatalogueGame } from '../catalogue/catalogue';
import { DAILY_SOURCES } from '../defi/daily';
import { grandGames } from '../grand/pool';
import { suitsMode } from '../modes';
import { DESCRIBE_QUESTIONS, MAINS_ID, MAINS_MAX, roundQuestions, SAFETY_RULES } from './mains';

const game = findCatalogueGame(MAINS_ID)!;

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

function open() {
  window.location.hash = `#/jeu/${MAINS_ID}`;
  return render(<App />);
}

/** Objets de la liste affichée, dans l'ordre. */
function listed() {
  const list = screen.getByRole('region', { name: 'Dans le sac' });
  return within(list)
    .getAllByRole('listitem')
    .map((li) => li.textContent!.trim());
}

describe('objets de Devine avec tes mains', () => {
  it('des objets du quotidien sur trois niveaux, chacun avec son image et de quoi le décrire', () => {
    expect(game.items.length).toBeGreaterThanOrEqual(24);
    // Assez d'objets à chaque niveau : une liste de Petits ne pioche jamais chez les Grands.
    for (const level of [1, 2, 3])
      expect(game.items.filter((i) => i.level === level).length).toBeGreaterThanOrEqual(MAINS_MAX);
    for (const item of game.items) {
      expect(item.emoji).toBeTruthy();
      expect(item.text).toBeTruthy();
    }
  });

  it('aucun objet interdit par le rappel de sécurité (relu un à un, ici les pièges connus)', () => {
    // Petits (moins de 4 cm), coupants ou pointus, chauds, à pile, fragiles, à ficelle.
    const forbidden =
      /bille|perle|pi[eè]ce|bouton|bague|\bcl[ée]\b|(^| )dé( |$)|lego|caillou|noix|noisette|marron|raisin|bonbon|ballon de baudruche|couteau|ciseau|fourchette|aiguille|[ée]pingle|pique|crayon|pomme de pin|coquillage|bougie|tasse chaude|t[ée]l[ée]commande|pile|montre|jouet [àa] piles|lampe|verre|miroir|ficelle|corde|[ée]charpe|sac en plastique|aimant/i;
    for (const item of game.items) expect(item.answer).not.toMatch(forbidden);
  });

  it('se joue à l’oral, au Coucher comme en Voiture, ni dans le Grand Jeu ni en défi du jour', () => {
    expect(game.needs).toEqual({ looks: false, moves: false });
    expect(game.activities[0]).toBe('parler');
    for (const mode of ['normal', 'express', 'coucher', 'voiture'] as const)
      expect(suitsMode(game.needs, mode)).toBe(true);
    expect(DAILY_SOURCES.some((s) => s.game === MAINS_ID)).toBe(false);
    expect(grandGames([game], [])).toEqual([]);
  });

  it('deux questions pour décrire à chaque manche, sans répétition sur cinq manches', () => {
    const asked = [1, 2, 3, 4, 5].flatMap(roundQuestions);
    expect(new Set(asked).size).toBe(DESCRIBE_QUESTIONS.length);
    expect(roundQuestions(6)).toEqual(roundQuestions(1));
    // Lisible d'un coup d'œil : des consignes courtes.
    for (const line of [...SAFETY_RULES, ...DESCRIBE_QUESTIONS])
      expect(line.length).toBeLessThanOrEqual(60);
  });
});

describe('Devine avec tes mains', () => {
  it('le rappel de sécurité d’abord, puis la liste, puis les manches', async () => {
    const user = userEvent.setup();
    open();
    expect(screen.getByRole('heading', { name: 'Devine avec tes mains' })).toBeInTheDocument();
    const safety = screen.getByRole('note', { name: 'Sécurité d’abord' });
    for (const word of ['4 cm', 'coupe', 'chaud', 'pile']) expect(safety).toHaveTextContent(word);

    const first = listed();
    expect(first).toHaveLength(MAINS_MAX);
    expect(screen.getByText(/sans que l’enfant regarde/)).toBeInTheDocument();
    // Une autre liste : d'autres objets.
    await user.click(screen.getByRole('button', { name: 'Une autre liste' }));
    const second = listed();
    expect(second).toHaveLength(MAINS_MAX);
    expect(second.filter((o) => first.includes(o))).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'C’est parti' }));
    expect(screen.queryByRole('note', { name: 'Sécurité d’abord' })).not.toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Manche' });
    expect(card).toHaveTextContent('L’enfant devine');
    expect(card).toHaveTextContent('Touche sans regarder.');
    expect(screen.getByText(`Manche 1 sur ${MAINS_MAX}`)).toBeInTheDocument();
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    for (const q of roundQuestions(1)) expect(parent).toHaveTextContent(q);

    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
    expect(screen.getByText(`Manche 2 sur ${MAINS_MAX}`)).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pas encore' }));
    expect(screen.getByText(`Manche 3 sur ${MAINS_MAX}`)).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
  });

  it('variante : l’enfant prépare le sac, le parent devine', async () => {
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole('radio', { name: 'Le parent devine' }));
    expect(screen.getByText(/en cachette du parent/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'C’est parti' }));
    expect(screen.getByRole('region', { name: 'Manche' })).toHaveTextContent('Le parent devine');
    expect(screen.getByRole('region', { name: 'Pour le parent' })).toHaveTextContent(
      'Décris à voix haute',
    );
  });

  it('en Express, trois objets dans le sac', async () => {
    await setSetting('gameMode', 'express');
    open();
    expect(listed()).toHaveLength(3);
  });

  it('Petits : seulement des objets de leur niveau', async () => {
    await setSetting('gameLevel', 1);
    open();
    const easy = game.items.filter((i) => i.level === 1).map((i) => i.answer);
    for (const object of listed()) expect(easy.some((a) => object.endsWith(a))).toBe(true);
  });
});
