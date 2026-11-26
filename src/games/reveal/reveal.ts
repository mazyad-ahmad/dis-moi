import type { CustomGame } from '../../data/db';
import type { CatalogueGame } from '../catalogue/catalogue';
import { customRouteId } from '../../data/customGames';
import { getSettings, setSetting } from '../../data/settings';
import type { DeckItem } from '../deck/types';
import { DISPARU_ID } from '../disparu/disparu';
import { COMPTE_ID } from '../compte/compte';
import { SUITE_ID } from '../suite/suite';
import { MARCHE_ID } from '../marche/marche';

/**
 * Image cachée (#62) : l'image d'une carte se dévoile par paliers, le parent avance d'un
 * palier à la fois. Option des jeux de type Image, catalogue ou créés.
 */
export const REVEAL_NAME = 'Image cachée';

/**
 * Photo : largeur, en carrés, de l'image pixelisée à chaque palier ; le dernier palier
 * montre la photo elle-même, nette. 6 carrés de large : rien de reconnaissable.
 * Chaque palier ne redessine qu'une toile de quelques dizaines de pixels, agrandie par le
 * navigateur sans lissage : fluide même avec une photo de 1280 px sur un petit téléphone.
 */
export const PIXEL_STEPS = [6, 12, 24, 48] as const;
/** Emoji (catalogue) : flou en pixels à chaque palier, puis net (petite surface à flouter). */
export const BLUR_STEPS = [28, 16, 9, 4] as const;
/** Nombre de paliers, le dernier compris (image nette). */
export const REVEAL_STEPS = PIXEL_STEPS.length + 1;

/** Largeur pixelisée d'un palier ; `undefined` au dernier palier (photo nette). */
export function pixelWidth(step: number): number | undefined {
  return PIXEL_STEPS[step];
}

/** Flou d'un palier pour un emoji ; 0 au dernier palier. */
export function blurOf(step: number): number {
  return BLUR_STEPS[step] ?? 0;
}

/** Hauteur de la toile pixelisée, en gardant les proportions de la photo. */
export function pixelHeight(width: number, naturalWidth: number, naturalHeight: number): number {
  if (!naturalWidth || !naturalHeight) return width;
  return Math.max(1, Math.round((width * naturalHeight) / naturalWidth));
}

/** Une carte se dévoile si elle montre une photo ou un emoji (une couleur ou un texte, non). */
export function canReveal(item: DeckItem): boolean {
  return !!item.image || (!!item.emoji && !item.color);
}

/**
 * Jeux du catalogue où l'option a un sens : type Image, sans mime (l'enfant doit voir ce
 * qu'il mime), avec des cartes à dévoiler (pas les pastilles de couleur) et hors Ombres (#61),
 * qui cache déjà l'image à sa façon, et hors L'intrus (#63), Qu'est-ce qui a disparu ? (#64),
 * Compte avec moi (#65), La suite logique (#129) et Le petit marché (#136), qui ont leur propre
 * écran.
 */
export function revealsInCatalogue(game: CatalogueGame): boolean {
  return (
    game.kind === 'image' &&
    !game.needs.moves &&
    game.id !== COMPTE_ID &&
    game.id !== SUITE_ID &&
    game.id !== MARCHE_ID &&
    !game.items.some((item) => item.shadow || item.others) &&
    game.id !== DISPARU_ID &&
    game.items.some(canReveal)
  );
}

/**
 * L'option est-elle activée pour ce jeu ? Jeu créé : choisie à la création (champ `reveal`) ;
 * jeu du catalogue : réglage `revealCatalogue` de l'espace Parent.
 */
export function revealOn(gameId: string, revealCatalogue: string[], custom: CustomGame[] = []) {
  const created = custom.find((g) => customRouteId(g.id) === gameId);
  if (created) return created.kind === 'image' && !!created.reveal;
  return revealCatalogue.includes(gameId);
}

/** Active ou coupe l'Image cachée d'un jeu du catalogue (choix mémorisé). */
export function toggleCatalogueReveal(id: string): Promise<void> {
  const list = getSettings().revealCatalogue;
  return setSetting(
    'revealCatalogue',
    list.includes(id) ? list.filter((g) => g !== id) : [...list, id],
  );
}
