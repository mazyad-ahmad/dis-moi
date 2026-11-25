/** Mélange de Fisher-Yates (copie), `random` injectable pour les tests. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Tire `count` éléments sans répétition (moins si la liste est plus courte). */
export function draw<T>(items: readonly T[], count: number, random?: () => number): T[] {
  return shuffle(items, random).slice(0, count);
}
