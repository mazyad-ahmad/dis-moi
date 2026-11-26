import { GAME_MODES, modeInfo, type GameMode } from '../games/modes';

/**
 * Façon de jouer (#42) : Normal, Express, Coucher ou Voiture, choisie au lancement.
 * Boutons radio, comme le niveau de la partie ; ce que change le mode est dit dessous.
 */
export function ModeChoice({
  value,
  onChange,
}: {
  value: GameMode;
  onChange: (mode: GameMode) => void;
}) {
  return (
    <fieldset className="setting level-choice">
      <legend className="eyebrow">Façon de jouer</legend>
      <div className={`segmented segmented--${GAME_MODES.length}`}>
        {GAME_MODES.map((m) => (
          <label key={m.value}>
            <input
              type="radio"
              name="mode-partie"
              value={m.value}
              checked={value === m.value}
              onChange={() => onChange(m.value)}
            />
            {m.name}
          </label>
        ))}
      </div>
      <p className="muted level-choice__ages">{modeInfo(value).desc}</p>
    </fieldset>
  );
}
