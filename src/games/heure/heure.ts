import { deckItems, getPack } from '../../content/packs';
import type { DeckItem } from '../deck/types';
import { cardLevel, type Level } from '../levels';
import { shuffle } from '../shuffle';

/**
 * Quelle heure est-il ? (#136) : une horloge à aiguilles dessinée par l'appli (SVG), l'enfant
 * lit l'heure. Les cartes du pack (`src/content/catalogue-heure.json`) sont des heures : `text`
 * en chiffres (« 3:15 »), `answer` en toutes lettres (« 3 heures et quart »). Moyens : heures
 * pile ; Grands : demies et quarts. Le cadran est dessiné à chaque manche d'après `text`.
 */
export const HEURE_ID = 'heure';

/** Heures du jeu (cartes du pack). */
export const HEURE_ITEMS: DeckItem[] = deckItems(getPack(HEURE_ID));

/** Une heure sur un cadran de 12 heures : `hour` de 1 à 12, `minute` 0, 15, 30 ou 45. */
export interface Time {
  hour: number;
  minute: number;
}

export const MINUTES = [0, 15, 30, 45] as const;

/** « 3:15 » → 3 h 15 ; rien si le texte n'est pas une heure du cadran au quart près. */
export function parseTime(text: string | undefined): Time | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text ?? '');
  if (!m) return undefined;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 1 || hour > 12 || !(MINUTES as readonly number[]).includes(minute)) return undefined;
  return { hour, minute };
}

/** Heure de la carte (son `text`). */
export function timeOf(item: DeckItem): Time {
  return parseTime(item.text) ?? { hour: 12, minute: 0 };
}

/** En chiffres, comme une montre numérique : « 3:15 ». */
export const digital = ({ hour, minute }: Time) => `${hour}:${String(minute).padStart(2, '0')}`;

/** Heure suivante sur le cadran (12 après 11, 1 après 12). */
export const nextHour = (hour: number) => (hour % 12) + 1;

/** « une heure », « 3 heures », « midi ». */
function hourName(hour: number): string {
  if (hour === 12) return 'midi';
  return hour === 1 ? 'une heure' : `${hour} heures`;
}

/**
 * L'heure en toutes lettres, comme on la dit : « 3 heures », « 3 heures et quart »,
 * « 3 heures et demie », « 4 heures moins le quart », « midi et demi ».
 */
export function timeName({ hour, minute }: Time): string {
  if (minute === 0) return hourName(hour);
  if (minute === 15) return `${hourName(hour)} et quart`;
  if (minute === 30) return `${hourName(hour)} et ${hour === 12 ? 'demi' : 'demie'}`;
  return `${hourName(nextHour(hour))} moins le quart`;
}

/** Angles des aiguilles, en degrés depuis le 12, dans le sens des aiguilles d'une montre. */
export function handAngles({ hour, minute }: Time): { hour: number; minute: number } {
  return { hour: (hour % 12) * 30 + minute / 2, minute: minute * 6 };
}

/** Coup de pouce selon les minutes : où est la grande aiguille. */
const MINUTE_HINTS: Record<number, string> = {
  0: 'La grande aiguille est tout en haut, sur le 12 : c’est l’heure pile.',
  15: 'La grande aiguille est sur le 3 : un quart de tour, c’est « et quart ».',
  30: 'La grande aiguille est sur le 6 : un demi-tour, c’est « et demie ».',
  45: 'La grande aiguille est sur le 9 : il manque un quart de tour pour l’heure suivante, c’est « moins le quart ».',
};

/** L'astuce de l'issue, toujours donnée en premier. */
export const HANDS_HINT = 'La petite aiguille montre les heures, la grande les minutes.';

export interface HeureCard {
  level: Level;
  time: Time;
  /** La réponse pour le parent. */
  explain: string;
  hints: string[];
}

/** La manche d'une carte : l'heure, la réponse en clair et les coups de pouce. */
export function makeHeure(item: DeckItem): HeureCard {
  const time = timeOf(item);
  const { hour, minute } = time;
  const where =
    minute === 0
      ? `la petite aiguille est sur le ${hour}`
      : minute === 45
        ? `la petite aiguille est presque sur le ${nextHour(hour)}`
        : `la petite aiguille a passé le ${hour}`;
  const twelve = hour === 12 ? ' (ou minuit)' : '';
  return {
    level: cardLevel(item) ?? 2,
    time,
    explain: `${item.answer}${twelve}, ${digital(time)} : ${where}. Le matin ou l’après-midi, les deux comptent.`,
    hints: [HANDS_HINT, MINUTE_HINTS[minute]],
  };
}

/**
 * Choix pour « Répondre en montrant » (#123), en chiffres, la réponse comprise, rangés dans
 * l'ordre : les confusions courantes d'abord (la même heure avec d'autres minutes, l'heure
 * d'à côté), puis d'autres heures.
 */
export function heureChoices(
  time: Time,
  count: number,
  random: () => number = Math.random,
): Time[] {
  const { hour, minute } = time;
  const before = ((hour + 10) % 12) + 1;
  const close: Time[] =
    minute === 0
      ? [
          { hour: nextHour(hour), minute: 0 },
          { hour: before, minute: 0 },
        ]
      : [
          ...MINUTES.filter((m) => m !== 0 && m !== minute).map((m) => ({ hour, minute: m })),
          { hour: minute === 45 ? nextHour(hour) : before, minute },
        ];
  const far = Array.from({ length: 12 }, (_, i) => ({ hour: i + 1, minute }));
  const seen = new Set([digital(time)]);
  const others = [...shuffle(close, random), ...shuffle(far, random)].filter(
    (t) => !seen.has(digital(t)) && (seen.add(digital(t)), true),
  );
  const shown = [time, ...others.slice(0, Math.max(0, count - 1))];
  return shown.sort((a, b) => a.hour - b.hour || a.minute - b.minute);
}
