import { schedule, parseMelody, type NoteEvent } from '../chanson/melody';
import { modeDrawSeconds, playsStill, type GameMode } from '../modes';

/**
 * Chasse au trésor maison (#60) : « Trouve quelque chose de rouge », l'enfant cherche, le
 * parent valide. Cartes dans `src/content/catalogue-tresor.json` (jeu du catalogue).
 * Deux façons de chercher : partout dans la maison, ou sans courir (le soir, les petits
 * espaces, le Coucher et la Voiture) où l'enfant montre l'objet du doigt sans se lever.
 * Le minuteur est facultatif et ne fait jamais perdre : à zéro, le parent décide.
 */
export const TREASURE_ID = 'tresor';

export type TreasureWay = 'run' | 'still';

export const TREASURE_WAYS: readonly { value: TreasureWay; label: string }[] = [
  { value: 'run', label: 'Partout' },
  { value: 'still', label: 'Sans courir' },
];

/** Ce que l'enfant fait de l'objet, dit après la consigne. */
export const WAY_LINE: Record<TreasureWay, string> = {
  run: 'Va le chercher dans la maison, puis reviens le montrer !',
  still: 'Sans te lever : cherche des yeux et montre-le du doigt.',
};

/** Ce que le parent fait, dans sa zone. */
export const WAY_PARENT: Record<TreasureWay, string> = {
  run: 'L’enfant rapporte l’objet (ou t’emmène le voir) : c’est toi qui valides.',
  still: 'L’enfant montre l’objet du doigt : c’est toi qui valides.',
};

/** Durée du minuteur : une minute pour courir, trente secondes sans se lever. */
export const WAY_SECONDS: Record<TreasureWay, number> = { run: 60, still: 30 };

/** Façon de chercher : celle du parent, sauf au Coucher et en Voiture (sans courir imposé). */
export function treasureWay(chosen: TreasureWay, mode: GameMode): TreasureWay {
  return playsStill(mode) ? 'still' : chosen;
}

/** Durée du minuteur ; 0 : pas de minuteur (au Coucher, comme pour le dessin). */
export function treasureSeconds(way: TreasureWay, mode: GameMode): number {
  return modeDrawSeconds(WAY_SECONDS[way], mode);
}

export function isTreasureWay(value: unknown): value is TreasureWay {
  return TREASURE_WAYS.some((w) => w.value === value);
}

/**
 * Musique d'attente : une petite boucle écrite pour l'appli (aucun droit tiers), jouée par
 * le synthétiseur des chansons, aucun fichier audio. Douce, lente, sans fin marquée.
 */
export const WAITING_TUNE =
  'C4 E4 G4 E4 | F4 A4 G4:2 | E4 G4 C5 G4 | F4 E4 D4:2 | C4 E4 G4 E4 | F4 A4 G4 E4 | D4 F4 E4 D4 | C4:2 R:2';
export const WAITING_BPM = 96;

/** Notes de la musique d'attente, la boucle répétée sur toute la durée du minuteur. */
export function waitingEvents(seconds: number): NoteEvent[] {
  const loop = parseMelody(WAITING_TUNE);
  const beats = loop.reduce((sum, n) => sum + n.beats, 0);
  const loopSeconds = (beats * 60) / WAITING_BPM;
  const times = Math.max(1, Math.ceil(seconds / loopSeconds));
  return schedule(Array.from({ length: times }, () => loop).flat(), WAITING_BPM, seconds);
}
