import { useState } from 'react';
import { useActivePlayers } from '../../data/players';
import { useSettings } from '../../data/settings';
import { arrange, choiceCount, choiceLevel, drawDistractors, type ChoiceOption } from './choices';

/**
 * Nombre de choix à montrer, ou 0 si l'enfant répond à voix haute (réglage de l'accueil).
 * En Voiture (#42), rien n'est à regarder : pas de choix.
 */
export function useChoiceCount(): number {
  const { showChoices, gameLevel, gameMode } = useSettings();
  const players = useActivePlayers();
  return showChoices && gameMode !== 'voiture'
    ? choiceCount(choiceLevel(gameLevel, players ?? []))
    : 0;
}

/**
 * Choix d'une manche, ou `null` sans « Répondre en montrant » ou sans `pool`.
 * Tirage figé pour la manche (le composant de manche est remonté à chaque manche).
 */
export function useChoices(
  answer: ChoiceOption | undefined,
  pool: readonly ChoiceOption[] | undefined,
): ChoiceOption[] | null {
  const count = useChoiceCount();
  const [draw] = useState(() =>
    answer && pool ? { others: drawDistractors(answer, pool), slot: Math.random() } : null,
  );
  if (!answer || !draw || !count) return null;
  const options = arrange(answer, draw.others, count, draw.slot);
  return options.length ? options : null;
}
