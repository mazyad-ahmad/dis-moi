import { setSetting, useSettings } from '../../data/settings';
import { useChoiceCount } from './useChoices';
import './choices.css';

const MODES = [
  { value: false, label: 'À voix haute' },
  { value: true, label: 'En montrant' },
];

/** Nombre de choix, d'après le niveau (lu seulement quand l'option est choisie). */
function CountHint() {
  const count = useChoiceCount();
  return (
    <p className="muted answer-mode__hint">
      L’enfant touche la réponse parmi {count} choix (sauf dans les jeux de dessin, de mime et la
      chasse au trésor).
    </p>
  );
}

/**
 * « Répondre en montrant » (#123), au lancement d'une partie : l'enfant qui ne parle pas
 * encore bien, ou timide, touche la réponse parmi quelques choix. S'applique à la partie suivante.
 */
export function AnswerModeChoice() {
  const { showChoices } = useSettings();
  return (
    <fieldset className="setting level-choice">
      <legend className="eyebrow">L’enfant répond</legend>
      <div className="segmented segmented--2">
        {MODES.map((m) => (
          <label key={m.label}>
            <input
              type="radio"
              name="reponse-enfant"
              value={m.value ? 'montrer' : 'voix'}
              checked={showChoices === m.value}
              onChange={() => void setSetting('showChoices', m.value)}
            />
            {m.label}
          </label>
        ))}
      </div>
      {showChoices && <CountHint />}
    </fieldset>
  );
}
