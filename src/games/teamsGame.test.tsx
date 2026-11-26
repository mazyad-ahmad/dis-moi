import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { db, type Player } from '../data/db';
import { createBackupFile } from '../data/backup';
import { totalStars } from '../data/history';
import { loadSettings, setSetting } from '../data/settings';
import type { Team } from './teams';

/** Joueurs lus dans la base avant le premier rendu : on laisse le temps à un appareil chargé. */
const slow = { timeout: 5000 };

beforeEach(async () => {
  sessionStorage.clear();
  await Promise.all([db.players.clear(), db.settings.clear(), db.games.clear()]);
  await loadSettings();
});

function open(path: string) {
  window.location.hash = `#${path}`;
  return render(<App />);
}

async function addKid(name: string, createdAt: number) {
  return db.players.add({ name, animal: 'renard', color: 'meadow', createdAt } as Player);
}

it('écran des équipes : invités ajoutés à la volée, sans toucher aux joueurs de la famille', async () => {
  const user = userEvent.setup();
  await addKid('Léa', 1);
  await addKid('Sami', 2);
  open('/equipes');

  const guest = await screen.findByLabelText('Prénom de l’invité', {}, slow);
  for (let i = 1; i <= 10; i++) {
    await user.type(guest, `Cousin ${i}`);
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));
  }
  // 12 enfants : on ne peut plus en ajouter, l'écran reste utilisable.
  expect(await screen.findByText('12 enfants au maximum.')).toBeInTheDocument();
  expect(screen.queryByLabelText('Prénom de l’invité')).toBeNull();

  await user.click(screen.getByRole('radio', { name: '3 équipes' }));
  const lists = screen.getAllByRole('list', { name: /^Enfants de/ });
  expect(lists).toHaveLength(3);
  expect(lists.map((l) => within(l).getAllByRole('listitem').length).sort()).toEqual([4, 4, 4]);

  // Toucher un prénom le fait changer d'équipe.
  const name = within(lists[0]).getAllByRole('button', { name: /changer d’équipe/ })[0];
  await user.click(name);
  expect(
    screen
      .getAllByRole('list', { name: /^Enfants de/ })
      .map((l) => within(l).getAllByRole('listitem').length),
  ).toEqual([3, 5, 4]);

  await user.clear(screen.getByLabelText('Nom de l’équipe 1'));
  await user.type(screen.getByLabelText('Nom de l’équipe 1'), 'Les Étoiles');
  await user.click(screen.getByRole('button', { name: 'C’est parti !' }));

  // Accueil : les équipes en cours.
  expect(await screen.findByText(/Les Étoiles, Les Grenouilles, Les Dauphins/)).toBeInTheDocument();
  const saved = (await db.settings.get('teams'))?.value as Team[];
  expect(saved.flatMap((t) => t.members)).toHaveLength(12);
  // Les invités ne sont pas des joueurs de la famille, ni dans la sauvegarde.
  expect((await db.players.toArray()).map((p) => p.name)).toEqual(['Léa', 'Sami']);
  const backup = JSON.parse(await (await createBackupFile()).text()) as {
    settings: Record<string, unknown>;
  };
  expect(backup.settings.teams).toBeUndefined();
}, 60_000);

it('les équipes jouent à tour de rôle ; total commun dans les étoiles de la famille, toutes fêtées', async () => {
  const user = userEvent.setup();
  const lea = await addKid('Léa', 1);
  await setSetting('rounds', 5);
  await setSetting('turnMode', 'turns');
  const teams: Team[] = [
    { name: 'Les Renards', color: 'dawn', members: [{ name: 'Léa', playerId: lea }] },
    { name: 'Les Dauphins', color: 'sky', members: [{ name: 'Tom' }, { name: 'Zoé' }] },
  ];
  await setSetting('teams', teams);
  open('/jeu/lettres');

  const names: string[] = [];
  for (let i = 1; i <= 5; i++) {
    expect(await screen.findByText(`Manche ${i} sur 5`, {}, slow)).toBeInTheDocument();
    // Pas de tour par tour individuel : c'est l'équipe qui joue.
    expect(screen.queryByText(/^À toi,/)).toBeNull();
    const turn = screen.getByText(/^À vous,/);
    names.push(turn.querySelector('strong')!.textContent!);
    await user.click(screen.getByRole('button', { name: i === 5 ? 'Passer' : 'Trouvé' }));
  }
  expect(names[0]).not.toBe(names[1]);
  names.forEach((n, i) => i >= 2 && expect(n).toBe(names[i - 2]));

  // Fin : le total commun en grand, chaque équipe fêtée.
  expect(
    await screen.findByRole('heading', { name: '4 étoiles gagnées ensemble !' }),
  ).toBeInTheDocument();
  const cheers = screen.getByRole('region', { name: 'Bravo à toutes les équipes !' });
  expect(within(cheers).getByText('Bravo, Les Renards !')).toBeInTheDocument();
  expect(within(cheers).getByText('Bravo, Les Dauphins !')).toBeInTheDocument();
  expect(screen.queryByText(/gagnant|perdant|classement/i)).toBeNull();

  await waitFor(async () => {
    const records = await db.games.toArray();
    expect(records).toHaveLength(1);
    expect(totalStars(records)).toBe(4);
    const [record] = records;
    // Seule Léa (de la famille) est notée ; les invités ne sont pas gardés.
    expect(record.playerIds).toEqual([lea]);
    expect(record.teams!.map((t) => t.stars).reduce((a, b) => a + b, 0)).toBe(4);
    expect(record.teams!.map((t) => t.name)).toEqual(['Les Renards', 'Les Dauphins']);
  });
}, 60_000);

it('accueil : « Arrêter » revient au jeu tous ensemble', async () => {
  const user = userEvent.setup();
  await setSetting('teams', [
    { name: 'Les Renards', color: 'dawn', members: [{ name: 'Tom' }] },
    { name: 'Les Dauphins', color: 'sky', members: [{ name: 'Zoé' }] },
  ]);
  open('/');
  await user.click(await screen.findByRole('button', { name: 'Arrêter' }, slow));
  expect(await screen.findByRole('link', { name: 'Jouer en équipes' })).toBeInTheDocument();
  expect((await db.settings.get('teams'))?.value).toBeNull();
}, 30_000);
