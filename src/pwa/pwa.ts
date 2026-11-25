import { useSyncExternalStore } from 'react';

/**
 * État PWA partagé : nouvelle version en attente, invite d'installation Android.
 * Petit store externe, lu par les composants avec useSyncExternalStore.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  /** Service worker d'une nouvelle version, installé et en attente. */
  waiting: ServiceWorker | null;
  /** Invite d'installation gardée pour le bouton « Installer l'appli ». */
  install: BeforeInstallPromptEvent | null;
  /** L'appli tourne déjà en mode installé (écran d'accueil). */
  installed: boolean;
}

let updating = false;
let state: PwaState = { waiting: null, install: null, installed: false };
const listeners = new Set<() => void>();

function set(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function usePwa(): PwaState {
  return useSyncExternalStore(subscribe, () => state);
}

/** Pour les tests. */
export function resetPwa(patch: Partial<PwaState> = {}) {
  state = { waiting: null, install: null, installed: false, ...patch };
  listeners.forEach((l) => l());
}

function watchInstalling(reg: ServiceWorkerRegistration) {
  const sw = reg.installing;
  if (!sw) return;
  sw.addEventListener('statechange', () => {
    // Un contrôleur existe déjà : c'est une mise à jour, pas la première installation.
    if (sw.state === 'installed' && navigator.serviceWorker.controller) set({ waiting: sw });
  });
}

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.register('./sw.js');
  if (reg.waiting && navigator.serviceWorker.controller) set({ waiting: reg.waiting });
  watchInstalling(reg);
  reg.addEventListener('updatefound', () => watchInstalling(reg));

  // Rechargement seulement après « Mettre à jour » : à la première visite, clients.claim()
  // change aussi de contrôleur, et la page ne doit pas se recharger sous les doigts.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updating) return;
    updating = false;
    window.location.reload();
  });

  // L'appli reste souvent ouverte longtemps : on revérifie au retour au premier plan.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void reg.update().catch(() => undefined);
  });
}

/** Active la nouvelle version ; la page se recharge au changement de contrôleur. */
export function applyUpdate() {
  if (!state.waiting) return;
  updating = true;
  state.waiting.postMessage('skip-waiting');
}

export function listenForInstall() {
  set({ installed: window.matchMedia?.('(display-mode: standalone)').matches ?? false });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    set({ install: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => set({ install: null, installed: true }));
}

export async function promptInstall(): Promise<void> {
  const prompt = state.install;
  if (!prompt) return;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  // Une invite ne sert qu'une fois ; Chrome en renverra une si l'appli n'est pas installée.
  set({ install: null, installed: outcome === 'accepted' });
}
