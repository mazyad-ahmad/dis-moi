import { PLAYER_COLORS, type PlayerColor } from '../data/db';
import { shuffle } from './shuffle';
import { rotation } from './turns';

/**
 * Jouer en équipes (#44), pour un anniversaire ou une réunion de cousins : deux ou trois
 * équipes, avec nom et couleur, qui jouent à tour de rôle (même rotation que le tour par
 * tour, `turns.ts`). Les invités sont ajoutés à la volée, sans être enregistrés comme
 * joueurs de la famille. Fonctions pures, sans base ni React.
 */

/** Un enfant d'une équipe : un joueur de la famille (`playerId`) ou un invité (prénom seul). */
export interface TeamMember {
  name: string;
  playerId?: number;
}

export interface Team {
  name: string;
  color: PlayerColor;
  members: TeamMember[];
}

/** Équipe à la fin d'une partie : son nom, sa couleur, ses étoiles et son nombre d'enfants. */
export interface TeamScore {
  name: string;
  color: PlayerColor;
  stars: number;
  children: number;
}

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 3;
/** Enfants au plus, toutes équipes confondues (famille et invités). */
export const MAX_CHILDREN = 12;
export const MAX_TEAM_NAME = 20;

/** Nom et couleur proposés pour chaque équipe, modifiables. */
export const DEFAULT_TEAMS: readonly { name: string; color: PlayerColor }[] = [
  { name: 'Les Renards', color: 'dawn' },
  { name: 'Les Grenouilles', color: 'meadow' },
  { name: 'Les Dauphins', color: 'sky' },
];

export function childCount(teams: readonly Team[]): number {
  return teams.reduce((n, t) => n + t.members.length, 0);
}

/** Les enfants, équipe après équipe. */
export function allMembers(teams: readonly Team[]): TeamMember[] {
  return teams.flatMap((t) => t.members);
}

/** Index de l'équipe la moins nombreuse (la première à égalité). */
function smallest(teams: readonly Team[]): number {
  return teams.reduce(
    (best, t, i) => (t.members.length < teams[best].members.length ? i : best),
    0,
  );
}

/** Répartit les enfants au hasard en équipes de tailles égales (à un près). */
export function spread(teams: readonly Team[], random?: () => number): Team[] {
  const out = teams.map((t) => ({ ...t, members: [] as TeamMember[] }));
  shuffle(allMembers(teams), random).forEach((m, i) => out[i % out.length].members.push(m));
  return out;
}

/** Nouvelles équipes (deux par défaut), avec les enfants répartis au hasard. */
export function newTeams(
  members: readonly TeamMember[],
  count = MIN_TEAMS,
  random?: () => number,
): Team[] {
  const teams: Team[] = DEFAULT_TEAMS.slice(0, count).map((t) => ({ ...t, members: [] }));
  if (teams.length) teams[0].members = members.slice(0, MAX_CHILDREN);
  return spread(teams, random);
}

/**
 * Passe à `count` équipes : une équipe ajoutée prend un nom et une couleur libres ; les
 * enfants d'une équipe retirée rejoignent les moins nombreuses.
 */
export function setTeamCount(teams: readonly Team[], count: number): Team[] {
  const n = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, count));
  const out = teams.slice(0, n).map((t) => ({ ...t, members: [...t.members] }));
  for (const t of teams.slice(n)) for (const m of t.members) out[smallest(out)].members.push(m);
  while (out.length < n) {
    const free =
      DEFAULT_TEAMS.find(
        (d) => !out.some((t) => t.name === d.name) && !out.some((t) => t.color === d.color),
      ) ?? DEFAULT_TEAMS[out.length];
    const color = out.some((t) => t.color === free.color)
      ? (PLAYER_COLORS.find((c) => !out.some((t) => t.color === c)) ?? free.color)
      : free.color;
    out.push({ name: free.name, color, members: [] });
  }
  return out;
}

/** Ajoute un enfant dans l'équipe la moins nombreuse ; rien au-delà de MAX_CHILDREN. */
export function addMember(teams: readonly Team[], member: TeamMember): Team[] {
  if (childCount(teams) >= MAX_CHILDREN || !teams.length) return [...teams];
  const target = smallest(teams);
  return teams.map((t, i) => (i === target ? { ...t, members: [...t.members, member] } : t));
}

/** L'enfant passe dans l'équipe suivante (la dernière renvoie à la première). */
export function moveMember(teams: readonly Team[], team: number, index: number): Team[] {
  const member = teams[team]?.members[index];
  if (!member) return [...teams];
  const to = (team + 1) % teams.length;
  return teams.map((t, i) => {
    if (i === team) return { ...t, members: t.members.filter((_, j) => j !== index) };
    if (i === to) return { ...t, members: [...t.members, member] };
    return t;
  });
}

export function removeMember(teams: readonly Team[], team: number, index: number): Team[] {
  return teams.map((t, i) =>
    i === team ? { ...t, members: t.members.filter((_, j) => j !== index) } : t,
  );
}

export function updateTeam(
  teams: readonly Team[],
  team: number,
  change: Partial<Pick<Team, 'name' | 'color'>>,
): Team[] {
  return teams.map((t, i) => (i === team ? { ...t, ...change } : t));
}

/** Nom d'équipe affiché : celui choisi, sinon le nom proposé. */
export function teamName(raw: string, index: number): string {
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_TEAM_NAME);
  return name || DEFAULT_TEAMS[index % DEFAULT_TEAMS.length].name;
}

/** Les équipes peuvent jouer : 2 ou 3, chacune avec au moins un enfant, 12 enfants au plus. */
export function teamsReady(teams: readonly Team[] | null | undefined): teams is Team[] {
  return (
    !!teams &&
    teams.length >= MIN_TEAMS &&
    teams.length <= MAX_TEAMS &&
    teams.every((t) => t.members.length > 0) &&
    childCount(teams) <= MAX_CHILDREN
  );
}

/** Équipes lues depuis la base : `null` si la valeur est illisible. */
export function readTeams(raw: unknown): Team[] | null {
  if (!Array.isArray(raw)) return null;
  const teams: Team[] = [];
  for (const t of raw as unknown[]) {
    if (typeof t !== 'object' || t === null) return null;
    const { name, color, members } = t as Record<string, unknown>;
    if (typeof name !== 'string' || !PLAYER_COLORS.includes(color as PlayerColor)) return null;
    if (!Array.isArray(members)) return null;
    const list: TeamMember[] = [];
    for (const m of members as unknown[]) {
      const member = m as Record<string, unknown> | null;
      if (!member || typeof member.name !== 'string') return null;
      list.push(
        Number.isInteger(member.playerId)
          ? { name: member.name, playerId: member.playerId as number }
          : { name: member.name },
      );
    }
    teams.push({ name, color: color as PlayerColor, members: list });
  }
  return teams;
}

/**
 * Étoiles de chaque équipe : `found[i]` dit si la manche i+1 a été trouvée, et l'équipe de
 * la manche suit la rotation `order` (index des équipes).
 */
export function teamScores(
  teams: readonly Team[],
  order: readonly number[],
  found: readonly boolean[],
): TeamScore[] {
  const turns = rotation(order, found.length);
  return teams.map((t, i) => ({
    name: t.name,
    color: t.color,
    children: t.members.length,
    stars: found.filter((f, round) => f && turns[round] === i).length,
  }));
}
