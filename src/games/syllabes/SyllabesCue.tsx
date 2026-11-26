import { ParentBlock } from '../../components/ParentBlock';
import { useSettings } from '../../data/settings';
import { syllabesLabel, type Syllabes } from './syllabes';
import './syllabes.css';

/**
 * Zone du parent d'une carte « Tape les syllabes » (#127) : le mot découpé et le nombre de
 * syllabes, d'emblée ; en Voiture, on compte à voix haute au lieu de taper.
 */
export function SyllabesCue({ syllabes, hint }: { syllabes: Syllabes; hint?: string }) {
  const car = useSettings().gameMode === 'voiture';
  const count = syllabesLabel(syllabes.count);
  return (
    <ParentBlock>
      {syllabes.kind === 'mot' ? (
        <>
          <p className="syllabes-cue">
            <strong className="syllabes-cue__parts">{syllabes.parts.join(' - ')}</strong>
            <span>{count}</span>
            {!car && (
              <span className="syllabes-cue__claps" aria-hidden="true">
                {'👏'.repeat(syllabes.count)}
              </span>
            )}
          </p>
          <p className="syllabes-cue__how">
            {car
              ? `Sans taper : l’enfant compte à voix haute, ${syllabes.parts
                  .map((p, i) => `« ${p} » ${i + 1}`)
                  .join(', ')}.`
              : 'L’enfant tape une fois dans ses mains par syllabe.'}
          </p>
          {hint && <p className="syllabes-cue__how">{hint}</p>}
        </>
      ) : (
        <>
          <p className="syllabes-cue">
            <strong>Un mot de {count}</strong>
            <span>Tout mot qui en a {syllabes.count} compte.</span>
          </p>
          <p className="syllabes-cue__how">
            Par exemple : <strong>{syllabes.examples.join(', ')}</strong>
          </p>
          <p className="syllabes-cue__how">
            {car
              ? 'Comptez ses syllabes ensemble à voix haute pour vérifier.'
              : 'Tapez-le ensemble dans vos mains pour vérifier.'}
          </p>
        </>
      )}
      <p className="syllabes-cue__how">Pas tout à fait ? On le redit ensemble et on continue !</p>
    </ParentBlock>
  );
}
