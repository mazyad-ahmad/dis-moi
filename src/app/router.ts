import { useSyncExternalStore } from 'react';

/** Routeur minimal par hash (#/chemin) : fonctionne hors ligne et depuis n'importe quel dossier. */
export type Route =
  | { name: 'home' }
  | { name: 'stars' }
  | { name: 'parent' }
  | { name: 'players' }
  | { name: 'add-game' }
  | { name: 'privacy' }
  | { name: 'game'; id: string }
  | { name: 'edit-game'; id: number }
  | { name: 'not-found'; path: string };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'home' };
  if (path === '/etoiles') return { name: 'stars' };
  if (path === '/parent') return { name: 'parent' };
  if (path === '/joueurs') return { name: 'players' };
  if (path === '/ajouter') return { name: 'add-game' };
  if (path === '/confidentialite') return { name: 'privacy' };
  const edit = /^\/creer\/(\d+)$/.exec(path);
  if (edit) return { name: 'edit-game', id: Number(edit[1]) };
  const game = /^\/jeu\/([a-z0-9-]+)$/.exec(path);
  if (game) return { name: 'game', id: game[1] };
  return { name: 'not-found', path };
}

export function href(path: string): string {
  return `#${path}`;
}

export function navigate(path: string): void {
  window.location.hash = path;
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseHash(hash);
}
