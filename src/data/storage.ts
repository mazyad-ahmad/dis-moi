import { useEffect, useState } from 'react';

/**
 * Stockage persistant : sans lui, le navigateur peut tout effacer si le téléphone manque de
 * place. Demandé après la première partie ou la première création de jeu, quand l'appli a
 * vraiment quelque chose à garder. Chrome accorde (ou non) sans afficher de question.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    const granted = await navigator.storage.persist();
    notify();
    return granted;
  } catch {
    return false;
  }
}

export interface StorageStatus {
  /** `undefined` : le navigateur ne sait pas le dire. */
  persisted?: boolean;
  /** Place utilisée par l'appli, en octets. */
  usage?: number;
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}

async function readStatus(): Promise<StorageStatus> {
  const status: StorageStatus = {};
  try {
    if (navigator.storage?.persisted) status.persisted = await navigator.storage.persisted();
    if (navigator.storage?.estimate) status.usage = (await navigator.storage.estimate()).usage;
  } catch {
    // Pas d'information : on n'affiche rien.
  }
  return status;
}

/** État du stockage, pour l'espace Parent. */
export function useStorageStatus(): StorageStatus {
  const [status, setStatus] = useState<StorageStatus>({});
  useEffect(() => {
    let live = true;
    const refresh = () => void readStatus().then((s) => live && setStatus(s));
    refresh();
    listeners.add(refresh);
    return () => {
      live = false;
      listeners.delete(refresh);
    };
  }, []);
  return status;
}

/** 12 345 678 → « 12 Mo ». */
export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${Math.round(bytes / (1024 * 1024))} Mo`;
}
