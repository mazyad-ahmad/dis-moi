import { HASARD, VARIANT_IDS, VARIANTS, type VariantChoice } from './variants';
import './variants.css';

const CHOICES: { value: VariantChoice; label: string }[] = [
  ...VARIANT_IDS.map((v) => ({ value: v, label: VARIANTS[v].label })),
  { value: 'hasard', label: HASARD.label },
];

/** Le parent choisit comment faire écouter l'air (#47) ; « Au hasard » tire à chaque manche. */
export function VariantPicker({
  value,
  onChange,
}: {
  value: VariantChoice;
  onChange: (v: VariantChoice) => void;
}) {
  return (
    <div className="song-variants">
      <div className="segmented segmented--variants" role="radiogroup" aria-label="Façon d’écouter">
        {CHOICES.map((c) => (
          <label key={c.value}>
            <input
              type="radio"
              name="variante"
              value={c.value}
              checked={value === c.value}
              onChange={() => onChange(c.value)}
            />
            {c.label}
          </label>
        ))}
      </div>
      {value === 'hasard' && <p className="song-variants__note">{HASARD.explain}</p>}
    </div>
  );
}
