export function starsLabel(stars: number): string {
  return `${stars} ${stars > 1 ? 'étoiles' : 'étoile'}`;
}

/** 42 → « 0:42 ». */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const DAY = 24 * 60 * 60 * 1000;

/** « aujourd'hui », « hier », sinon « lundi 24 novembre ». */
export function dayLabel(timestamp: number, now = Date.now()): string {
  const start = (t: number) => new Date(t).setHours(0, 0, 0, 0);
  const days = Math.round((start(now) - start(timestamp)) / DAY);
  if (days === 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(timestamp);
}
