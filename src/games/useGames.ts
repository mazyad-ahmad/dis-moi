import { customDeck, customRouteId, useCustomGames } from '../data/customGames';
import type { CustomGame } from '../data/db';
import { setSetting, getSettings, useSettings } from '../data/settings';
import { ALL_LEVELS, KIND_ACTIVITY } from './activities';
import { CATALOGUE, findCatalogueGame } from './catalogue/catalogue';
import { GRAND_ID, GRAND_NAME } from './grand/pool';
import { DAILY_ID, DAILY_NAME } from './defi/daily';
import { BREATHE_ID, BREATHE_NAME } from './respire/exercises';
import { needsOf, suitsMode } from './modes';
import { GAMES, type GameInfo } from './registry';

/** Un jeu créé a le type choisi à la création (sinon celui de sa façon de jouer) et un âge facultatif. */
export function customInfo(g: CustomGame): GameInfo {
  const d = customDeck(g);
  const { id, name, category, tint, mark } = d;
  return {
    id,
    name,
    category,
    tint,
    mark,
    needs: needsOf(d.kind),
    activities: [g.activity ?? KIND_ACTIVITY[g.kind]],
    levels: g.level ? [g.level] : [...ALL_LEVELS],
  };
}

/** Jeux de l'accueil : jeux de base, jeux du catalogue ajoutés, puis jeux créés. */
export function useHomeGames(): GameInfo[] {
  const { catalogue } = useSettings();
  const custom = useCustomGames() ?? [];
  const added = CATALOGUE.filter((g) => catalogue.includes(g.id)).map(
    ({ id, name, category, tint, mark, needs, activities, levels, skill }): GameInfo => ({
      id,
      name,
      category,
      tint,
      mark,
      needs,
      activities,
      levels,
      skill,
    }),
  );
  return [...GAMES, ...added, ...custom.map(customInfo)];
}

/** Jeux de l'accueil qui conviennent à la façon de jouer choisie (#42). */
export function usePlayableGames(): GameInfo[] {
  const { gameMode } = useSettings();
  return useHomeGames().filter((g) => suitsMode(g.needs, gameMode));
}

export function toggleCatalogueGame(id: string): Promise<void> {
  const list = getSettings().catalogue;
  return setSetting('catalogue', list.includes(id) ? list.filter((g) => g !== id) : [...list, id]);
}

/** Nom d'un jeu pour l'historique (un jeu créé a pu être supprimé depuis). */
export function gameName(gameId: string, custom: CustomGame[] = []): string {
  if (gameId === GRAND_ID) return GRAND_NAME;
  if (gameId === BREATHE_ID) return BREATHE_NAME;
  return (
    GAMES.find((g) => g.id === gameId)?.name ??
    findCatalogueGame(gameId)?.name ??
    custom.find((g) => customRouteId(g.id) === gameId)?.name ??
    (gameId === DAILY_ID ? DAILY_NAME : undefined) ??
    'Jeu supprimé'
  );
}
