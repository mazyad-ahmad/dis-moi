import { ParentBlock } from '../../components/ParentBlock';
import type { Consigne } from './consigne';
import './jacques.css';

/**
 * Zone du parent d'une carte « Jacques a dit » (#57) : piège ou pas, en clair et d'emblée,
 * et ce qui rapporte l'étoile. Rien à dévoiler, pas d'indice : on enchaîne.
 */
export function JacquesCue({ consigne }: { consigne: Consigne }) {
  const trap = consigne === 'piege';
  return (
    <ParentBlock>
      <p className={`jacques-cue jacques-cue--${trap ? 'trap' : 'go'}`}>
        <span className="jacques-cue__mark" aria-hidden="true">
          {trap ? '⚠️' : '✅'}
        </span>
        <strong>{trap ? 'Piège !' : 'Jacques a dit'}</strong>
        <span>{trap ? 'L’enfant ne doit pas bouger.' : 'L’enfant le fait.'}</span>
      </p>
      <p className="jacques-cue__star">
        {trap ? 'Une étoile s’il reste immobile.' : 'Une étoile s’il le fait.'} Piégé ? On rit et on
        continue !
      </p>
    </ParentBlock>
  );
}
