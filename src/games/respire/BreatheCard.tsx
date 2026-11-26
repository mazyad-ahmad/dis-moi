import { href } from '../../app/router';
import { Card } from '../../components/Card';
import { useSettings } from '../../data/settings';
import { forcesNight } from '../modes';
import { BREATHE_NAME } from './exercises';
import './respire.css';

/** Respire comme… (#126) sur l'accueil, à part des jeux : un moment pour redescendre. */
export function BreatheCard() {
  const bedtime = forcesNight(useSettings().gameMode);
  return (
    <Card className="respire-card">
      <span className="respire-card__icon" aria-hidden="true">
        🌬️
      </span>
      <span className="respire-card__text">
        <span className="eyebrow">{BREATHE_NAME}</span>
        <span>
          {bedtime ? 'On respire doucement avant de dormir.' : 'Un moment pour se calmer, à deux.'}
        </span>
      </span>
      <a href={href('/respire')}>Respirer</a>
    </Card>
  );
}
