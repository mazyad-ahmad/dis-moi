export function starsLabel(stars: number): string {
  return `${stars} ${stars > 1 ? 'étoiles' : 'étoile'}`;
}

/** 42 → « 0:42 ». */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
