import { href } from '../app/router';
import { Button } from '../components/Button';
import { setSetting, useSettings } from '../data/settings';
import { teamsReady } from '../games/teams';

/** Accueil : les équipes en cours (#44), avec Modifier et Arrêter. */
export function TeamsLine() {
  const { teams } = useSettings();
  if (!teamsReady(teams)) return null;
  return (
    <div className="teams-line teams-line--on" role="group" aria-label="Équipes">
      <span>
        <span className="eyebrow">En équipes</span>{' '}
        <strong>{teams.map((t) => t.name).join(', ')}</strong>
      </span>
      <span className="teams-line__actions">
        <a href={href('/equipes')}>Modifier les équipes</a>
        <Button variant="ghost" onClick={() => void setSetting('teams', null)}>
          Arrêter
        </Button>
      </span>
    </div>
  );
}
