import { Button } from './Button';

interface Props {
  onSkip: () => void;
  onFound: () => void;
  skipLabel?: string;
  foundLabel?: string;
}

/** Les deux boutons de validation du parent, en bas de l'écran de jeu. */
export function AnswerBar({ onSkip, onFound, skipLabel = 'Passer', foundLabel = 'Trouvé' }: Props) {
  return (
    <div className="answer-bar">
      <Button variant="secondary" onClick={onSkip}>
        {skipLabel}
      </Button>
      <Button onClick={onFound}>{foundLabel}</Button>
    </div>
  );
}
