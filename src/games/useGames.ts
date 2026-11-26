import { customDeck, customRouteId, useCustomGames } from '../data/customGames';
import type { CustomGame } from '../data/db';
import { setSetting, getSettings, useSettings } from '../data/settings';
import { CATALOGUE, findCatalogueGame } from './catalogue/catalogue';
import { GRAND_ID, GRAND_NAME } from './grand/pool';
import { GAMES, type GameInfo } from './registry';

function customInfo(g: CustomGame): GameInfo {
  const d = customDeck(g);
  return { id: d.id, name: d.name, category: d.category, tint: d.tint, mark: d.mark };
}

/** Jeux de l'accueil : jeux de base, jeux du catalogue ajoutés, puis jeux créés. */
export function useHomeGames(): GameInfo[] {
  const { catalogue } = useSettings();
  const custom = useCustomGames() ?? [];
  const added = CATALOGUE.filter((g) => catalogue.includes(g.id)).map(
    ({ id, name, category, tint, mark }): GameInfo => ({ id, name, category, tint, mark }),
  );
  return [...GAMES, ...added, ...custom.map(customInfo)];
}

export function toggleCatalogueGame(id: string): Promise<void> {
  const list = getSettings().catalogue;
  return setSetting('catalogue', list.includes(id) ? list.filter((g) => g !== id) : [...list, id]);
}

/** Nom d'un jeu pour l'historique (un jeu créé a pu être supprimé depuis). */
export function gameName(gameId: string, custom: CustomGame[] = []): string {
  if (gameId === GRAND_ID) return GRAND_NAME;
  return (
    GAMES.find((g) => g.id === gameId)?.name ??
    findCatalogueGame(gameId)?.name ??
    custom.find((g) => customRouteId(g.id) === gameId)?.name ??
    'Jeu supprimé'
  );
}
