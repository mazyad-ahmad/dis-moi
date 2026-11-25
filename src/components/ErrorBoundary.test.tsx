import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

let broken = false;
function Fragile() {
  if (broken) throw new Error('Carte introuvable');
  return <p>Partie en cours</p>;
}

beforeEach(() => {
  // React signale l'erreur dans la console : attendu ici.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  window.location.hash = '#/jeu/lettres';
});
afterEach(() => vi.restoreAllMocks());

function renderFragile(resetKey = 'a') {
  return render(
    <ErrorBoundary resetKey={resetKey}>
      <Fragile />
    </ErrorBoundary>,
  );
}

describe('Écran « Oups »', () => {
  it('remplace la page blanche par un message rassurant, sans rien envoyer', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const beacon = vi.fn();
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    broken = true;
    renderFragile();

    expect(screen.getByRole('heading', { name: 'Oups !' })).toBeInTheDocument();
    expect(screen.getByText(/Les étoiles déjà gagnées sont gardées/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accueil' })).toBeInTheDocument();
    // Détail technique replié, avec le message de l'erreur.
    expect(screen.getByText('Détail technique').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText(/Error: Carte introuvable/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
  });

  it('« Réessayer » remonte l’écran', async () => {
    const user = userEvent.setup();
    broken = true;
    renderFragile();
    broken = false; // le souci était passager
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(screen.getByText('Partie en cours')).toBeInTheDocument();
  });

  it('« Accueil » ramène à l’accueil', async () => {
    const user = userEvent.setup();
    broken = true;
    renderFragile();
    broken = false;
    await user.click(screen.getByRole('button', { name: 'Accueil' }));
    expect(window.location.hash).toBe('#/');
    expect(screen.getByText('Partie en cours')).toBeInTheDocument();
  });

  it('un autre écran repart sans l’erreur', () => {
    broken = true;
    const { rerender } = renderFragile('a');
    expect(screen.getByRole('heading', { name: 'Oups !' })).toBeInTheDocument();
    broken = false;
    rerender(
      <ErrorBoundary resetKey="b">
        <Fragile />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Partie en cours')).toBeInTheDocument();
  });

  it('copie le détail technique dans le presse-papiers', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    broken = true;
    renderFragile();
    await user.click(screen.getByText('Détail technique'));
    await user.click(screen.getByRole('button', { name: 'Copier le détail' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Carte introuvable'));
    expect(await screen.findByText('Détail copié.')).toBeInTheDocument();
  });
});
