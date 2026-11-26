import { Button } from './Button';
import { useStarFlight } from './StarFlight';

interface Props {
  onSkip: () => void;
  onFound: () => void;
  skipLabel?: string;
  foundLabel?: string;
}

/** Les deux boutons de validation du parent, en bas de l'écran de jeu. */
export function AnswerBar({ onSkip, onFound, skipLabel = 'Passer', foundLabel = 'Trouvé' }: Props) {
  const flight = useStarFlight();
  return (
    <div className="answer-bar">
      <Button variant="secondary" onClick={onSkip}>
        {skipLabel}
      </Button>
      <Button
        onClick={(e) => {
          // L'étoile s'envole, mais la manche suivante arrive tout de suite.
          flight.launch(e.currentTarget);
          onFound();
        }}
      >
        {foundLabel}
      </Button>
      {flight.stars}
    </div>
  );
}
