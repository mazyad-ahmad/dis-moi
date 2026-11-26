import { href } from '../app/router';
import { Button } from '../components/Button';
import { setSetting, useSettings } from '../data/settings';
import { MAX_CHILDREN, teamsReady } from '../games/teams';

/** Accueil : jouer en équipes (#44), ou les équipes en cours avec Modifier et Arrêter. */
export function TeamsLine() {
  const { teams } = useSettings();
  if (!teamsReady(teams))
    return (
      <p className="teams-line">
        <a href={href('/equipes')}>Jouer en équipes</a>
        <span className="muted">
          Fête, cousins : 2 ou 3 équipes, {MAX_CHILDREN} enfants au plus
        </span>
      </p>
    );
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
