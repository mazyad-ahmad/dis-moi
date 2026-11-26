import { useCustomGames } from '../../data/customGames';
import { setSetting, getSettings, useSettings } from '../../data/settings';
import { useHomeGames } from '../useGames';
import { suitsMode } from '../modes';
import { grandGames, includedGames, type GrandGame } from './pool';

export interface GrandPool {
  /** Tous les jeux de l'accueil jouables dans le Grand Jeu. */
  all: GrandGame[];
  /** Ceux que le parent a gardés, parmi ceux qui conviennent à la façon de jouer (#42). */
  included: GrandGame[];
}

/** Jeux du Grand Jeu ; `undefined` tant que les jeux créés ne sont pas chargés. */
export function useGrandPool(): GrandPool | undefined {
  const home = useHomeGames();
  const custom = useCustomGames();
  const { grandExcluded, gameMode } = useSettings();
  if (custom === undefined) return undefined;
  const all = grandGames(home, custom);
  const suited = all.filter((g) => suitsMode(g.needs, gameMode));
  return { all, included: includedGames(suited, grandExcluded) };
}

/** Inclut ou retire un jeu du Grand Jeu (choix mémorisé). */
export function toggleGrandGame(id: string): Promise<void> {
  const list = getSettings().grandExcluded;
  return setSetting(
    'grandExcluded',
    list.includes(id) ? list.filter((g) => g !== id) : [...list, id],
  );
}
