import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';
import {
  isRightAnswer,
  isUnlocked,
  lock,
  newQuestion,
  onNavigate,
  unlock,
  UNLOCK_MS,
} from '../data/parentLock';
import { loadSettings, setSetting } from '../data/settings';

beforeEach(async () => {
  await db.settings.clear();
  await loadSettings();
  lock();
  window.location.hash = '';
});

/** Lit l'opération affichée et renvoie la bonne réponse. */
function expectedAnswer(): string {
  const name = screen.getByRole('textbox').getAttribute('id')!;
  const text = document.querySelector(`label[for="${name}"] .sr-only`)!.textContent!;
  const [, a, b] = /Combien font (\d+) plus (\d+)/.exec(text)!;
  return String(Number(a) + Number(b));
}

describe('opération du verrou', () => {
  it('donne un résultat entre 10 et 18', () => {
    for (const r of [0, 0.5, 0.999]) {
      const q = newQuestion(() => r);
      expect(q.a + q.b).toBeGreaterThanOrEqual(10);
      expect(q.a + q.b).toBeLessThanOrEqual(18);
    }
  });

  it('vérifie la réponse', () => {
    expect(isRightAnswer({ a: 7, b: 5 }, '12')).toBe(true);
    expect(isRightAnswer({ a: 7, b: 5 }, ' 12 ')).toBe(true);
    expect(isRightAnswer({ a: 7, b: 5 }, '13')).toBe(false);
    expect(isRightAnswer({ a: 7, b: 5 }, '')).toBe(false);
  });
});

it('verrou désactivé : l’espace Parent s’ouvre directement', async () => {
  window.location.hash = '#/parent';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Espace parent' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Désactivé' })).toBeChecked();
  expect(screen.queryByRole('textbox', { name: /^Combien font/ })).not.toBeInTheDocument();
});

it.each([
  ['#/parent', 'Espace parent'],
  ['#/joueurs', 'Joueurs'],
  ['#/ajouter', 'Ajouter un jeu'],
  ['#/creer/1', 'Espace parent'],
])('verrou actif : %s demande l’opération', async (hash) => {
  await setSetting('parentLock', true);
  window.location.hash = hash;
  render(<App />);
  expect(
    screen.getByRole('textbox', { name: /^Combien font \d+ plus \d+ \?$/ }),
  ).toBeInTheDocument();
  expect(screen.queryByText('Remise à zéro')).not.toBeInTheDocument();
  expect(screen.queryByPlaceholderText('Prénom')).not.toBeInTheDocument();
});

it('verrou actif : les jeux restent libres', async () => {
  await setSetting('parentLock', true);
  window.location.hash = '#/jeu/devinette';
  render(<App />);
  expect(screen.queryByRole('textbox', { name: /^Combien font/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Trouvé' })).toBeInTheDocument();
});

it('mauvaise réponse : nouvelle opération ; bonne réponse : on entre', async () => {
  const user = userEvent.setup();
  await setSetting('parentLock', true);
  window.location.hash = '#/parent';
  render(<App />);

  const right = expectedAnswer();
  await user.type(screen.getByRole('textbox'), String((Number(right) + 1) % 100));
  await user.click(screen.getByRole('button', { name: 'Entrer' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ce n’est pas ça');
  expect(screen.getByRole('textbox')).toHaveValue('');
  expect(screen.getByRole('textbox')).toHaveFocus();

  await user.type(screen.getByRole('textbox'), expectedAnswer());
  await user.click(screen.getByRole('button', { name: 'Entrer' }));
  expect(await screen.findByText('Remise à zéro')).toBeInTheDocument();
});

it('activer le verrou depuis l’espace Parent ne met pas le parent dehors', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/parent';
  render(<App />);
  await user.click(screen.getByRole('radio', { name: 'Activé' }));
  await waitFor(async () => expect((await db.settings.get('parentLock'))?.value).toBe(true));
  expect(screen.getByText('Remise à zéro')).toBeInTheDocument();
  window.location.hash = '#/joueurs';
  expect(await screen.findByPlaceholderText('Prénom')).toBeInTheDocument();
});

describe('durée du déverrouillage', () => {
  const parent = { name: 'parent' } as const;
  const game = { name: 'game', id: 'chanson' } as const;

  it('reverrouille après l’échéance, au changement d’écran', () => {
    unlock(0);
    onNavigate(game, UNLOCK_MS - 1);
    expect(isUnlocked()).toBe(true);
    onNavigate(parent, UNLOCK_MS);
    expect(isUnlocked()).toBe(false);
  });

  it('un écran parent prolonge, un jeu non', () => {
    unlock(0);
    onNavigate(parent, UNLOCK_MS - 1);
    onNavigate(game, 2 * UNLOCK_MS - 2);
    expect(isUnlocked()).toBe(true);
    onNavigate(game, 2 * UNLOCK_MS - 1);
    expect(isUnlocked()).toBe(false);
  });
});
