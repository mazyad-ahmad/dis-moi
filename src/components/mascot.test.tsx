import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db } from '../data/db';
import { setTheme } from '../data/settings';
import { Mascot, type MascotMood } from './Mascot';

const MOODS: MascotMood[] = ['hello', 'think', 'bravo', 'sleep'];

beforeEach(async () => {
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await setTheme('auto');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Simule le thème sombre du téléphone. */
function systemDark(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: dark && query.includes('dark'),
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

function show(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

const mascot = () => screen.getByTestId('mascot');

it.each(MOODS)('« %s » : SVG en ligne, décoratif, sans image ni texte', (mood) => {
  const { container } = render(<Mascot mood={mood} />);
  const svg = container.querySelector('svg')!;
  expect(svg).toHaveAttribute('aria-hidden', 'true');
  expect(svg).toHaveAttribute('data-mood', mood);
  expect(container.querySelector('img, image, use, text, title')).toBeNull();
  // Aucun nom ni texte lisible par un lecteur d'écran.
  expect(svg.textContent).toBe('');
  // Poids négligeable : quelques centaines d'octets de dessin.
  expect(renderToStaticMarkup(<Mascot mood={mood} />).length).toBeLessThan(2000);
});

it('accueil : la mascotte dit bonjour, et dort en thème nuit', async () => {
  systemDark(false);
  show('/');
  expect(mascot()).toHaveAttribute('data-mood', 'hello');
  await setTheme('night');
  expect(await screen.findByTestId('mascot')).toHaveAttribute('data-mood', 'sleep');
});

it('accueil en thème « auto » : suit le thème sombre du téléphone', () => {
  systemDark(true);
  show('/');
  expect(mascot()).toHaveAttribute('data-mood', 'sleep');
});

it('écrans vides : la mascotte réfléchit', async () => {
  show('/etoiles');
  expect(await screen.findByText("Pas encore d'étoiles")).toBeInTheDocument();
  expect(mascot()).toHaveAttribute('data-mood', 'think');
});

it('jamais pendant une manche, bravo sur l’écran de fin', async () => {
  const user = userEvent.setup();
  show('/jeu/lettres');
  for (let i = 0; i < 10; i++) {
    expect(screen.queryByTestId('mascot')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Trouvé' }));
  }
  expect(screen.getByRole('heading', { name: '10 étoiles gagnées ensemble !' })).toBeVisible();
  expect(mascot()).toHaveAttribute('data-mood', 'bravo');
  expect(mascot()).toHaveAttribute('aria-hidden', 'true');
});
