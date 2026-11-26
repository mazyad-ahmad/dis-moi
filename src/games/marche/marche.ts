import { deckItems, getPack } from '../../content/packs';
import type { DeckItem } from '../deck/types';
import { cardLevel, type Level } from '../levels';
import { shuffle } from '../shuffle';

/**
 * Le petit marché (#136) : un article avec son prix, l'enfant dit quelles pièces donner. Les
 * cartes du pack (`src/content/catalogue-marche.json`) sont des articles : `emoji`, `answer`
 * (« une baguette ») et le prix dans `text` (« 1 € », « 1,20 € »), réaliste et sous 10 €.
 * Moyens : des euros ronds, avec des pièces de 1 € et 2 € ; Grands : des centimes aussi, avec
 * des pièces de 10, 20 et 50 centimes. Les pièces sont dessinées par l'appli (SVG), aucune
 * photo de vraie monnaie.
 */
export const MARCHE_ID = 'marche';

/** Articles du jeu (cartes du pack). */
export const MARCHE_ITEMS: DeckItem[] = deckItems(getPack(MARCHE_ID));

/** Prix le plus haut, en centimes (critère de l'issue : moins de 10 €). */
export const MAX_PRICE = 999;

/** Pièces du porte-monnaie selon le niveau, en centimes, de la plus grosse à la plus petite. */
export const COINS: Record<Level, number[]> = {
  1: [200, 100],
  2: [200, 100],
  3: [200, 100, 50, 20, 10],
};

/** « 1,20 € » ou « 3 € » → centimes ; rien si ce n'est pas un prix. */
export function parsePrice(text: string | undefined): number | undefined {
  const m = /^(\d)(?:,(\d{2}))? €$/.exec(text ?? '');
  if (!m) return undefined;
  return Number(m[1]) * 100 + Number(m[2] ?? 0);
}

/** Prix de l'article (son `text`), en centimes. */
export const priceOf = (item: DeckItem) => parsePrice(item.text) ?? 100;

/** Prix écrit : « 3 € », « 1,20 € », « 0,50 € ». */
export function priceText(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest ? `${euros},${String(rest).padStart(2, '0')} €` : `${euros} €`;
}

/** Prix dit à voix haute : « 3 euros », « 1 euro 20 », « 50 centimes ». */
export function priceWords(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  if (!euros) return `${rest} centimes`;
  const e = `${euros} euro${euros > 1 ? 's' : ''}`;
  return rest ? `${e} ${rest}` : e;
}

/** Ce qui est écrit sur la pièce : « 2 € », « 50 c ». */
export const coinText = (cents: number) => (cents >= 100 ? `${cents / 100} €` : `${cents} c`);

/** Nom d'une pièce pour le lecteur d'écran : « 2 euros », « 50 centimes ». */
export const coinName = (cents: number) =>
  cents >= 100 ? `${cents / 100} euro${cents > 100 ? 's' : ''}` : `${cents} centimes`;

/** Des pièces, de la plus grosse à la plus petite : « 1 € + 20 c ». */
export const coinsText = (coins: readonly number[]) => coins.map(coinText).join(' + ');

/** Pour le lecteur d'écran : « 1 euro et 20 centimes ». */
export function coinsName(coins: readonly number[]): string {
  const names = coins.map(coinName);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} et ${names.at(-1)}` : names[0];
}

/** Le moins de pièces possible pour `cents` (la monnaie en euros le permet en prenant la plus grosse d'abord). */
export function fewestCoins(cents: number, coins: readonly number[]): number[] {
  const out: number[] = [];
  let left = cents;
  for (const coin of coins)
    while (left >= coin) {
      out.push(coin);
      left -= coin;
    }
  return out;
}

export const sum = (coins: readonly number[]) => coins.reduce((a, b) => a + b, 0);

export interface MarcheCard {
  level: Level;
  item: DeckItem;
  price: number;
  /** Pièces du porte-monnaie, de la plus grosse à la plus petite. */
  coins: number[];
  /** Une bonne réponse, avec le moins de pièces. */
  answer: number[];
  question: string;
  explain: string;
  hints: string[];
}

/** « Une baguette » d'après « une baguette ». */
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** La manche d'un article : son prix, les pièces du niveau et une façon de payer. */
export function makeMarche(item: DeckItem): MarcheCard {
  const price = priceOf(item);
  // Un prix avec des centimes demande les petites pièces, quel que soit le niveau de la carte.
  const level = cardLevel(item) ?? (price % 100 ? 3 : 2);
  const coins = COINS[price % 100 ? 3 : level];
  const answer = fewestCoins(price, coins);
  const n = answer.length;
  return {
    level,
    item,
    price,
    coins,
    answer,
    question: `${capital(item.answer)} coûte ${priceWords(price)}. Quelles pièces donnes-tu ?`,
    explain: `Par exemple ${coinsText(answer)} : ${n} pièce${n > 1 ? 's' : ''} pour ${priceText(price)}. Une autre façon de faire ${priceText(price)} compte aussi.`,
    hints: [
      'Commencez par la plus grosse pièce qui ne dépasse pas le prix, puis complétez.',
      price % 100
        ? 'Comptez d’abord les euros, puis les centimes : 50 et 20, ça fait 70.'
        : 'Posez les pièces une à une en comptant à voix haute : 2, 3 euros…',
    ],
  };
}

/**
 * Choix pour « Répondre en montrant » (#123) : des poignées de pièces, la bonne (le moins de
 * pièces) et d'autres qui font un peu plus ou un peu moins, chacune un montant différent.
 * Dans le désordre.
 */
export function marcheChoices(
  card: MarcheCard,
  count: number,
  random: () => number = Math.random,
): number[][] {
  const step = card.coins.at(-1)!;
  const near = [-1, 1, -2, 2, 3, -3, 4, 5]
    .map((k) => card.price + k * step)
    .filter((q) => q > 0 && q <= MAX_PRICE + step);
  const ordered = [...shuffle(near.slice(0, 4), random), ...near.slice(4)];
  const others = ordered.slice(0, Math.max(0, count - 1)).map((q) => fewestCoins(q, card.coins));
  return shuffle([card.answer, ...others], random);
}
