import {
  addMember,
  childCount,
  MAX_CHILDREN,
  moveMember,
  newTeams,
  readTeams,
  removeMember,
  setTeamCount,
  spread,
  teamName,
  teamScores,
  teamsReady,
  type TeamMember,
} from './teams';

const kids = (n: number): TeamMember[] =>
  Array.from({ length: n }, (_, i) => ({ name: `Enfant ${i + 1}` }));

const sizes = (teams: { members: unknown[] }[]) => teams.map((t) => t.members.length);

describe('équipes', () => {
  it('nouvelles équipes : deux, nom et couleur différents, enfants répartis à un près', () => {
    const teams = newTeams(kids(5));
    expect(teams).toHaveLength(2);
    expect(new Set(teams.map((t) => t.name)).size).toBe(2);
    expect(new Set(teams.map((t) => t.color)).size).toBe(2);
    expect(sizes(teams).sort()).toEqual([2, 3]);
  });

  it('12 enfants en 3 équipes : 4-4-4, sans perdre personne', () => {
    const all = kids(12);
    const teams = spread(newTeams(all, 3));
    expect(sizes(teams)).toEqual([4, 4, 4]);
    expect(teams.flatMap((t) => t.members.map((m) => m.name)).sort()).toEqual(
      all.map((m) => m.name).sort(),
    );
  });

  it('un enfant ajouté va dans l’équipe la moins nombreuse ; pas plus de 12', () => {
    let teams = newTeams(kids(3));
    teams = addMember(teams, { name: 'Invité' });
    expect(sizes(teams).sort()).toEqual([2, 2]);
    for (let i = 0; i < 20; i++) teams = addMember(teams, { name: `Cousin ${i}` });
    expect(childCount(teams)).toBe(MAX_CHILDREN);
  });

  it('toucher un prénom le fait passer dans l’équipe suivante, la dernière renvoie à la première', () => {
    const teams = setTeamCount(newTeams(kids(3)), 3);
    const name = teams[2].members[0]?.name ?? teams[0].members[0].name;
    const from = teams.findIndex((t) => t.members.some((m) => m.name === name));
    const index = teams[from].members.findIndex((m) => m.name === name);
    const moved = moveMember(teams, from, index);
    expect(moved[(from + 1) % 3].members.map((m) => m.name)).toContain(name);
    expect(moved[from].members.map((m) => m.name)).not.toContain(name);
    expect(childCount(moved)).toBe(3);
  });

  it('passer de 3 à 2 équipes garde tous les enfants ; de 2 à 3, une couleur libre', () => {
    const three = setTeamCount(newTeams(kids(6)), 3);
    expect(three).toHaveLength(3);
    expect(new Set(three.map((t) => t.color)).size).toBe(3);
    const two = setTeamCount(spread(three), 2);
    expect(two).toHaveLength(2);
    expect(childCount(two)).toBe(6);
    expect(setTeamCount(two, 5)).toHaveLength(3);
    expect(setTeamCount(two, 1)).toHaveLength(2);
  });

  it('prêtes à jouer : chaque équipe a au moins un enfant', () => {
    const teams = newTeams(kids(2));
    expect(teamsReady(teams)).toBe(true);
    const [a] = teams;
    expect(teamsReady(removeMember(teams, 0, 0))).toBe(a.members.length !== 1);
    expect(teamsReady(newTeams([]))).toBe(false);
    expect(teamsReady(null)).toBe(false);
  });

  it('nom vide : le nom proposé ; nom trop long : coupé', () => {
    expect(teamName('  ', 0)).toBe('Les Renards');
    expect(teamName('  Les   Étoiles ', 1)).toBe('Les Étoiles');
    expect(teamName('x'.repeat(40), 0)).toHaveLength(20);
  });

  it('équipes relues de la base : valeur illisible refusée', () => {
    const teams = newTeams([{ name: 'Léa', playerId: 3 }, { name: 'Invité' }]);
    expect(readTeams(JSON.parse(JSON.stringify(teams)))).toEqual(teams);
    expect(readTeams('x')).toBeNull();
    expect(readTeams([{ name: 'A', color: 'noir', members: [] }])).toBeNull();
  });

  it('étoiles par équipe : chaque manche trouvée compte pour l’équipe de son tour', () => {
    const teams = newTeams(kids(4));
    // Ordre : équipe 2, puis équipe 1 ; manches 1 et 3 pour l'équipe 2.
    const scores = teamScores(teams, [1, 0], [true, true, true, false, false]);
    expect(scores.map((s) => s.stars)).toEqual([1, 2]);
    expect(scores.map((s) => s.children)).toEqual([2, 2]);
    expect(scores.reduce((n, s) => n + s.stars, 0)).toBe(3);
  });
});
