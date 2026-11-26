import { useEffect, useState } from 'react';
import { AnswerPhoto } from './media';
import type { DeckItem } from './types';

/** Durée d'affichage de la photo après « Trouvé », en millisecondes. */
export const FOUND_PHOTO_MS = 3000;

/**
 * Après « Trouvé », la manche suivante arrive tout de suite ; la photo de l'animal trouvé
 * s'affiche par-dessus quelques secondes (un appui la ferme plus tôt).
 */
export function useFoundPhoto() {
  const [found, setFound] = useState<{ item: DeckItem; at: number }>();
  useEffect(() => {
    if (!found) return;
    const timer = window.setTimeout(() => setFound(undefined), FOUND_PHOTO_MS);
    return () => window.clearTimeout(timer);
  }, [found]);
  const show = (item: DeckItem | undefined) => {
    if (item?.photoUrl) setFound({ item, at: Date.now() });
  };
  const overlay = found && (
    <button
      type="button"
      className="found-photo"
      onClick={() => setFound(undefined)}
      aria-label={`${found.item.answer} ! Toucher pour fermer la photo`}
    >
      <span className="found-photo__card">
        <AnswerPhoto item={found.item} />
        <strong className="found-photo__name">{found.item.answer}</strong>
      </span>
    </button>
  );
  return { show, overlay };
}
