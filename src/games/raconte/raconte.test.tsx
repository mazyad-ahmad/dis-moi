import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../data/db';
import { loadSettings, setSetting } from '../../data/settings';
import { DAILY_SOURCES } from '../defi/daily';
import { grandGames } from '../grand/pool';
import { LEVELS } from '../levels';
import { suitsMode } from '../modes';
import { findGame, GAMES } from '../registry';
import { NO_STAR_MESSAGE, RACONTE_ID, CHAT_QUESTIONS, THANKS_LABEL } from './raconte';
import { chatTheme, CHAT_THEMES } from './themes';

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
  await setSetting('rounds', 3);
});

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

describe('questions de Raconte-moi', () => {
  it('60 questions ouvertes, réparties sur les trois niveaux et les quatre thèmes', () => {
    expect(CHAT_QUESTIONS).toHaveLength(60);
    for (const { value: level } of LEVELS) {
      const atLevel = CHAT_QUESTIONS.filter((q) => q.level === level);
      expect(atLevel.length).toBeGreaterThanOrEqual(15);
      for (const theme of CHAT_THEMES)
        expect(atLevel.some((q) => chatTheme(q.tags)?.value === theme.value)).toBe(true);
    }
    for (const q of CHAT_QUESTIONS) expect(q.answer).toMatch(/\?$/);
  });

  // Relecture outillée : rien d'intrusif ni d'anxiogène (secrets, peurs, comparaison).
  it('aucune question intrusive ou anxiogène', () => {
    const banned =
      /secret|peur|cauchemar|effra|angoiss|inquiet|triste|pleur|colère|méchant|mort|malade|punition|puni|gronder|honte|mieux que|plus que les autres|autres enfants|comparer|bêtise|mensonge|mentir|interdit/i;
    for (const q of CHAT_QUESTIONS) expect(q.answer).not.toMatch(banned);
  });

  it('jouable en mode Voiture et en mode Coucher, ni dans le Grand Jeu ni dans le défi', () => {
    const game = findGame(RACONTE_ID)!;
    expect(game.name).toBe('Raconte-moi');
    expect(suitsMode(game.needs, 'voiture')).toBe(true);
    expect(suitsMode(game.needs, 'coucher')).toBe(true);
    expect(game.levels).toEqual([1, 2, 3]);
    // Sans bonne réponse : pas de manche « Trouvé » dans le Grand Jeu, pas de défi du jour.
    expect(grandGames(GAMES, []).map((g) => g.id)).not.toContain(RACONTE_ID);
    expect(DAILY_SOURCES.map((s) => s.game)).not.toContain(RACONTE_ID);
  });
});

describe('une partie de Raconte-moi', () => {
  it('« Merci de m’avoir raconté » donne l’étoile ; « Passer » n’en retire jamais', async () => {
    const user = userEvent.setup();
    open(`/jeu/${RACONTE_ID}`);
    expect(await screen.findByText('Manche 1 sur 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Raconte-moi' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Trouvé' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Voir la réponse/ })).not.toBeInTheDocument();
    const parent = screen.getByRole('region', { name: 'Pour le parent' });
    expect(parent).toHaveTextContent('tu réponds à ton tour');
    expect(parent).toHaveTextContent('Rien n’est enregistré');

    await user.click(screen.getByRole('button', { name: THANKS_LABEL }));
    expect(await screen.findByText('Manche 2 sur 3')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();

    // Passer : même nombre d'étoiles, aucun message.
    const before = document.querySelector('main')!.textContent;
    await user.click(screen.getByRole('button', { name: 'Passer' }));
    expect(await screen.findByText('Manche 3 sur 3')).toBeInTheDocument();
    expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(before).not.toMatch(/dommage|raté|perdu/i);

    await user.click(screen.getByRole('button', { name: THANKS_LABEL }));
    expect(
      await screen.findByRole('heading', { name: '2 étoiles gagnées ensemble !' }),
    ).toBeInTheDocument();
  });

  it('tout passer finit sur un mot doux, et seules les étoiles sont gardées', async () => {
    const user = userEvent.setup();
    open(`/jeu/${RACONTE_ID}`);
    const asked: string[] = [];
    for (let i = 1; i <= 3; i++) {
      expect(await screen.findByText(`Manche ${i} sur 3`)).toBeInTheDocument();
      const card = screen.getByRole('region', { name: 'Question' });
      asked.push(card.querySelector('.deck-card__question')!.textContent!);
      await user.click(screen.getByRole('button', { name: 'Passer' }));
    }
    expect(await screen.findByText(NO_STAR_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/Pas d’étoile/)).not.toBeInTheDocument();

    // Aucune réponse ni question enregistrée : la partie ne garde que ses chiffres.
    await waitFor(async () =>
      expect(await db.games.toArray()).toMatchObject([{ gameId: RACONTE_ID, played: 3, stars: 0 }]),
    );
    const saved = JSON.stringify(await db.games.toArray());
    for (const q of asked) expect(saved).not.toContain(q);
  });

  it.each(['voiture', 'coucher'] as const)('se joue en mode %s', async (mode) => {
    const user = userEvent.setup();
    await setSetting('gameMode', mode);
    open('/');
    expect(await screen.findByRole('link', { name: /Raconte-moi/ })).toHaveAttribute(
      'href',
      `#/jeu/${RACONTE_ID}`,
    );
    await user.click(screen.getByRole('link', { name: /Raconte-moi/ }));
    expect(await screen.findByText('Manche 1 sur 3')).toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Question' });
    expect(within(card).getByText(/\?$/)).toBeInTheDocument();
  });
});
