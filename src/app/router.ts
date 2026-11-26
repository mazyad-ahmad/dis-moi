import { useSyncExternalStore } from 'react';

/** Routeur minimal par hash (#/chemin) : fonctionne hors ligne et depuis n'importe quel dossier. */
/** Sous-pages de l'espace Parent : les réglages rangés par thème. */
export const PARENT_SECTIONS = ['partie', 'sons', 'temps', 'apparence', 'appli'] as const;
export type ParentSectionId = (typeof PARENT_SECTIONS)[number];

export type Route =
  | { name: 'home' }
  | { name: 'stars' }
  | { name: 'parent' }
  | { name: 'parent-section'; id: ParentSectionId }
  | { name: 'players' }
  | { name: 'teams' }
  | { name: 'add-game' }
  | { name: 'privacy' }
  | { name: 'breathe' }
  | { name: 'game'; id: string }
  | { name: 'edit-game'; id: number }
  | { name: 'not-found'; path: string };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'home' };
  if (path === '/etoiles') return { name: 'stars' };
  if (path === '/parent') return { name: 'parent' };
  if (path === '/joueurs') return { name: 'players' };
  if (path === '/equipes') return { name: 'teams' };
  if (path === '/ajouter') return { name: 'add-game' };
  if (path === '/confidentialite') return { name: 'privacy' };
  if (path === '/respire') return { name: 'breathe' };
  const section = /^\/parent\/([a-z]+)$/.exec(path)?.[1] as ParentSectionId | undefined;
  if (section && PARENT_SECTIONS.includes(section)) return { name: 'parent-section', id: section };
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
