import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { addPlayer, setPlayerLevel } from '../../data/players';
import { loadSettings, setSetting } from '../../data/settings';
import { ageLabel } from '../activities';
import { findCatalogueGame } from '../catalogue/catalogue';
import { DAILY_SOURCES } from '../defi/daily';
import { grandGames } from '../grand/pool';
import { suitsMode } from '../modes';
import { HOLD_GOAL, isTrick, NIOUI_ID, restorePace, step } from './nioui';

const game = findCatalogueGame(NIOUI_ID)!;

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

function open() {
  window.location.hash = `#/jeu/${NIOUI_ID}`;
  return render(<App />);
}

const tenu = () => userEvent.click(screen.getByRole('button', { name: 'Tenu !' }));

describe('questions de Ni oui ni non', () => {
  it('60 questions pour les Grands, avec une idée de réponse sans oui ni non', () => {
    expect(game.items).toHaveLength(60);
    expect(game.levels).toEqual([3]);
    expect(ageLabel(game.levels)).toBe('Dès 7 ans');
    for (const item of game.items) {
      expect(item.text).toMatch(/\?$/);
      expect(item.answer).not.toMatch(/(^|[^\p{L}])(oui|non)([^\p{L}]|$)/iu);
    }
    expect(game.items.filter(isTrick).length).toBeGreaterThan(0);
  });

  it('se joue à l’oral, en Voiture aussi, ni dans le Grand Jeu ni en défi du jour', () => {
    expect(game.needs).toEqual({ looks: false, moves: false });
    expect(game.activities[0]).toBe('parler');
    expect(suitsMode(game.needs, 'voiture')).toBe(true);
    expect(DAILY_SOURCES.some((s) => s.game === NIOUI_ID)).toBe(false);
    expect(grandGames([game], [])).toEqual([]);
  });

  it(`l’étoile après ${HOLD_GOAL} questions tenues ; un oui ou un non termine la manche`, () => {
    let pace = { next: 0, held: 0 };
    for (let i = 1; i < HOLD_GOAL; i++) {
      const r = step(pace, true, 60);
      expect(r.done).toBeUndefined();
      pace = r.pace;
    }
    expect(step(pace, true, 60)).toEqual({
      pace: { next: HOLD_GOAL, held: 0 },
      done: { star: true },
    });
    expect(step({ next: 2, held: 3 }, false, 60)).toEqual({
      pace: { next: 3, held: 0 },
      done: { star: false },
    });
    // Toutes les questions posées : on repart du début.
    expect(step({ next: 59, held: 0 }, true, 60).pace.next).toBe(0);
    expect(restorePace({ next: 4, held: 2 }, 60)).toEqual({ next: 4, held: 2 });
    expect(restorePace({ next: 60, held: 0 }, 60)).toBeUndefined();
    expect(restorePace({ next: 0, held: HOLD_GOAL }, 60)).toBeUndefined();
  });
});

describe('Ni oui ni non', () => {
  it('le parent pose les questions ; 5 tenues = une étoile, sans minuteur', async () => {
    open();
    expect(screen.getByRole('heading', { name: 'Ni oui ni non' })).toBeInTheDocument();
    const question = screen.getByRole('region', { name: 'Question' });
    expect(question).toHaveTextContent('Le parent pose la question');
    const first = question.textContent;
    expect(screen.getByRole('radio', { name: 'L’enfant répond' })).toBeChecked();
    expect(screen.getByText(/Tenu :/)).toHaveTextContent(`Tenu : 0 sur ${HOLD_GOAL}`);
    expect(screen.getByRole('region', { name: 'Pour le parent' })).toHaveTextContent(
      'sans dire « oui » ni « non »',
    );
    // Pas de minuteur.
    expect(document.querySelector('.timer')).toBeNull();
    expect(screen.queryByText(/secondes?/)).not.toBeInTheDocument();

    await tenu();
    expect(screen.getByRole('region', { name: 'Question' }).textContent).not.toBe(first);
    expect(screen.getByText(/Tenu :/)).toHaveTextContent(`Tenu : 1 sur ${HOLD_GOAL}`);
    // Les rôles se choisissent au début de la manche.
    expect(screen.queryByRole('radiogroup', { name: 'Qui répond ?' })).not.toBeInTheDocument();
    for (let i = 2; i < HOLD_GOAL; i++) await tenu();
    expect(screen.getByText('Manche 1 sur 10')).toBeInTheDocument();
    await tenu();
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    expect(screen.getByText(/Tenu :/)).toHaveTextContent(`Tenu : 0 sur ${HOLD_GOAL}`);
  });

  it('un oui échappé : on rit, nouvelle manche sans étoile, et on peut changer de rôle', async () => {
    const user = userEvent.setup();
    open();
    await tenu();
    await tenu();
    await user.click(screen.getByRole('button', { name: 'Oups, un oui ou un non' }));
    expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
    expect(screen.getByLabelText('0 étoile')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('on rit');

    await user.click(screen.getByRole('radio', { name: 'Le parent répond' }));
    expect(screen.getByRole('region', { name: 'Question' })).toHaveTextContent(
      'L’enfant pose la question',
    );
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    expect(parent).toHaveTextContent('Tu réponds sans dire');
    await user.click(within(parent).getByRole('button', { name: 'Une idée de réponse' }));
    expect(parent).toHaveTextContent('«');
  });

  it('en Express, trois manches', async () => {
    await setSetting('gameMode', 'express');
    open();
    expect(screen.getByText('Manche 1 sur 3')).toBeInTheDocument();
  });

  it('réservé aux Grands : rangé sous « Pour d’autres âges » quand Léa a 3 ans', async () => {
    const lea = await addPlayer('Léa');
    await setPlayerLevel(lea, 1);
    await setSetting('catalogue', [NIOUI_ID]);
    window.location.hash = '#/';
    render(<App />);
    const others = await screen.findByRole('region', { name: 'Pour d’autres âges' });
    expect(within(others).getByRole('link', { name: /Ni oui ni non/ })).toBeInTheDocument();
  });
});
