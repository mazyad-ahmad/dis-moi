import { useCallback, useEffect, useState } from 'react';

/**
 * Partie en cours gardée dans `sessionStorage`, pour la reprendre après un rafraîchissement
 * (ou le rechargement qui suit une mise à jour de l'appli) : même tirage, même manche,
 * mêmes étoiles, même partie dans l'historique (#114).
 *
 * Un objet JSON par jeu, un champ par morceau d'état. Le tout disparaît en fin de partie,
 * quand on quitte le jeu et à la fermeture de l'onglet : on ne retombe jamais sur une
 * vieille partie. Tout est écrit de façon synchrone (pas dans un effet) pour qu'aucun
 * ordre d'effets ne fasse revivre une partie terminée.
 */
const PREFIX = 'dis-moi:partie:';

type Saved = Record<string, unknown>;

function key(gameId: string) {
  return PREFIX + gameId;
}

function read(gameId: string): Saved | undefined {
  try {
    const raw = sessionStorage.getItem(key(gameId));
    const data: unknown = raw ? JSON.parse(raw) : undefined;
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Saved) : undefined;
  } catch {
    return undefined;
  }
}

function write(gameId: string, data: Saved) {
  try {
    sessionStorage.setItem(key(gameId), JSON.stringify(data));
  } catch {
    // Stockage indisponible (navigation privée, quota) : la partie ne sera pas reprise.
  }
}

export function readSaved(gameId: string, field: string): unknown {
  return read(gameId)?.[field];
}

/** `onlyIfStarted` : n'écrit pas si la partie a été terminée (ou quittée) entre-temps. */
export function writeSaved(gameId: string, field: string, value: unknown, onlyIfStarted = false) {
  const data = read(gameId);
  if (onlyIfStarted && !data) return;
  write(gameId, { ...data, [field]: value });
}

export function clearSaved(gameId: string) {
  try {
    sessionStorage.removeItem(key(gameId));
  } catch {
    // Rien à effacer.
  }
}

/**
 * Comme `useState`, mais gardé dans la partie en cours. Un état sauvegardé illisible
 * (jeu modifié entre-temps, ancienne version) fait repartir sur une nouvelle partie.
 * L'état doit être du JSON. Le setter prend une valeur (pas de fonction) : elle est écrite
 * tout de suite.
 */
export function useSaved<T>(
  gameId: string,
  field: string,
  init: () => T,
  restore: (saved: unknown) => T | undefined,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const saved = readSaved(gameId, field);
    if (saved !== undefined) {
      const restored = restore(saved);
      if (restored !== undefined) return restored;
      clearSaved(gameId);
    }
    // Écrit avant de rendre la main : un second appel (StrictMode) relit ce même tirage.
    const fresh = init();
    writeSaved(gameId, field, fresh);
    return fresh;
  });
  const set = useCallback(
    (next: T) => {
      writeSaved(gameId, field, next);
      setValue(next);
    },
    [gameId, field],
  );
  return [value, set];
}

/**
 * Tirage figé pour la partie, retrouvé après un rafraîchissement. On garde la clé de chaque
 * élément (identifiant, mot…) et non l'élément lui-même : les cartes créées par le parent
 * contiennent des photos et des sons.
 */
export function useSavedDraw<T>(
  gameId: string,
  field: string,
  items: readonly T[],
  make: () => T[],
  keyOf: (item: T, index: number) => string,
): T[] {
  // Clé d'un élément du tirage = sa clé dans la liste complète.
  const [byKey] = useState(() => {
    const map = new Map<string, T>();
    items.forEach((item, i) => map.set(keyOf(item, i), item));
    return map;
  });
  const [keys] = useSaved<string[]>(
    gameId,
    field,
    () => {
      const keyByItem = new Map<T, string>();
      [...byKey].forEach(([k, item]) => keyByItem.set(item, k));
      return make().map((item) => keyByItem.get(item)!);
    },
    (saved) => {
      if (!Array.isArray(saved) || !saved.length) return undefined;
      return saved.every((k) => typeof k === 'string' && byKey.has(k)) ? saved : undefined;
    },
  );
  // Le tirage est figé : les éléments retrouvés une fois, au premier rendu.
  const [drawn] = useState(() => keys.map((k) => byKey.get(k)!));
  return drawn;
}

const pendingClear = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Efface la partie quand on quitte le jeu (retour à l'accueil, autre écran). Un
 * rafraîchissement ne démonte rien : la partie reste. Effacement différé pour survivre
 * au démontage-remontage immédiat de React (StrictMode, « Rejouer »).
 */
export function useClearSavedOnLeave(gameId: string) {
  useEffect(() => {
    clearTimeout(pendingClear.get(gameId));
    pendingClear.delete(gameId);
    return () => {
      pendingClear.set(
        gameId,
        setTimeout(() => {
          pendingClear.delete(gameId);
          clearSaved(gameId);
        }, 0),
      );
    };
  }, [gameId]);
}
