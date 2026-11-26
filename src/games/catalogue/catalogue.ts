import { deckItems, getPack } from '../../content/packs';
import { levelsOf, type Activity } from '../activities';
import type { Deck, DeckKind } from '../deck/types';
import type { Level } from '../levels';
import { needsOf, type PlayNeeds } from '../modes';

export interface CatalogueGame extends Deck {
  desc: string;
  /** Ce que le jeu demande à l'enfant (#42), d'après son type et son pack. */
  needs: PlayNeeds;
  /** Trouver le bon jeu (#137) : types, tranche d'âge (niveaux des cartes), ce qu'il fait travailler. */
  activities: Activity[];
  levels: Level[];
  skill: string;
}

/**
 * Jeux du catalogue (maquette Ajouter), dans l'ordre de l'écran « Ajouter un jeu ».
 * Contenu écrit pour l'appli, dans `src/content/catalogue-<id>.json` :
 * pas d'enregistrement ni d'image téléchargée, donc pas de droits à vérifier.
 */
export const CATALOGUE_PACKS = [
  'animal',
  'couleur',
  'mime',
  'devinette',
  'emotion',
  'emotion-mime',
  'tresor',
];

export const CATALOGUE: CatalogueGame[] = CATALOGUE_PACKS.map((id) => {
  const pack = getPack(id);
  return {
    id: pack.id,
    name: pack.name,
    category: pack.category!,
    desc: pack.desc!,
    mark: pack.mark!,
    tint: pack.tint!,
    kind: pack.kind as DeckKind,
    items: deckItems(pack),
    needs: needsOf(pack.kind, {
      ...(pack.moves && { moves: true }),
      ...(pack.still && { still: true }),
    }),
    activities: pack.activities!,
    levels: levelsOf(pack.items),
    skill: pack.skill!,
  };
});

export function findCatalogueGame(id: string): CatalogueGame | undefined {
  return CATALOGUE.find((g) => g.id === id);
}
