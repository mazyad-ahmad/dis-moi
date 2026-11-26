import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import './styles/global.css';
import './components/ui.css';
import './components/reward.css';
import { App } from './app/App';
import { loadSettings } from './data/settings';
import { listenForInstall, registerServiceWorker } from './pwa/pwa';

function start() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Réglages lus avant le premier rendu (thème, manches) ; sans base, on garde les défauts.
loadSettings()
  .catch(() => undefined)
  .finally(start);

listenForInstall();
// Service worker seulement sur le build : en dev, il garderait d'anciens fichiers en cache.
if (import.meta.env.PROD) {
  window.addEventListener('load', () => void registerServiceWorker().catch(() => undefined));
}
