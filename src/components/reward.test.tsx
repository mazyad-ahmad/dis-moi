import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';

beforeEach(async () => {
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  window.location.hash = '#/jeu/lettres';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Simule le réglage « réduire les animations » du téléphone. */
function reduceMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({ matches: reduce && query.includes('reduced-motion') }) as MediaQueryList,
  );
}

const flights = () => document.querySelectorAll('[data-testid="star-flight"]');
const counter = () => document.querySelector('.game-header__stars')!;

it('« Trouvé » : une étoile s’envole vers le compteur, qui rebondit', async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(counter()).not.toHaveClass('is-bumped');

  await user.click(screen.getByRole('button', { name: 'Passer' }));
  expect(flights()).toHaveLength(0);
  expect(counter()).not.toHaveClass('is-bumped');

  await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  // La manche suivante est déjà là, sans attendre l'animation.
  expect(screen.getByText('Manche 3 sur 10')).toBeInTheDocument();
  expect(screen.getByLabelText('1 étoile')).toHaveClass('is-bumped');
  expect(flights()).toHaveLength(1);
  expect(flights()[0]).toHaveAttribute('aria-hidden', 'true');

  // Arrivée : l'étoile disparaît.
  await waitFor(() => expect(flights()).toHaveLength(0));
});

it('enchaîner vite n’accumule pas les étoiles qui volent', async () => {
  const user = userEvent.setup();
  render(<App />);
  for (let i = 0; i < 6; i++) await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  expect(screen.getByText('Manche 7 sur 10')).toBeInTheDocument();
  expect(screen.getByLabelText('6 étoiles')).toBeInTheDocument();
  expect(flights().length).toBeLessThanOrEqual(3);
});

it('avec « réduire les animations », pas d’étoile qui vole, le compteur reste juste', async () => {
  reduceMotion(true);
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  expect(flights()).toHaveLength(0);
  expect(screen.getByLabelText('1 étoile')).toBeInTheDocument();
  expect(screen.getByText('Manche 2 sur 10')).toBeInTheDocument();
});

it('la nouvelle manche entre en douceur', async () => {
  const user = userEvent.setup();
  render(<App />);
  const first = screen.getByTestId('glyph').closest('figure');
  expect(first).toHaveClass('round-in');
  await user.click(screen.getByRole('button', { name: 'Passer' }));
  const second = screen.getByTestId('glyph').closest('figure');
  // Nouvel élément : l'animation d'entrée repart.
  expect(second).not.toBe(first);
  expect(second).toHaveClass('round-in');
});

it('des confettis à la fin de la partie, même sans étoile', async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
  for (let i = 0; i < 10; i++) await user.click(screen.getByRole('button', { name: 'Passer' }));
  expect(screen.getByRole('heading', { name: 'Bravo d’avoir joué !' })).toBeInTheDocument();
  const confetti = screen.getByTestId('confetti');
  expect(confetti).toHaveAttribute('aria-hidden', 'true');
  expect(confetti.children.length).toBeGreaterThan(10);
});
