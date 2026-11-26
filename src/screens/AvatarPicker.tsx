import { useId, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { PLAYER_ANIMALS, PLAYER_COLORS } from '../data/db';
import { COLOR_NAMES, type Avatar as AvatarValue } from '../data/players';

interface Props {
  name: string;
  value: AvatarValue;
  onChange: (avatar: AvatarValue) => void;
  onClose: () => void;
}

/** Choix de l'animal et de la couleur d'un joueur ; chaque touche s'applique tout de suite. */
export function AvatarPicker({ name, value: initial, onChange, onClose }: Props) {
  const id = useId();
  // Choix affiché tout de suite : l'enregistrement d'un joueur existant est asynchrone, et la
  // case cochée ne doit pas revenir en arrière le temps que la base réponde.
  const [value, setValue] = useState<AvatarValue>({ animal: initial.animal, color: initial.color });
  function choose(avatar: AvatarValue) {
    setValue(avatar);
    onChange(avatar);
  }
  return (
    <Dialog labelledBy={`${id}-title`} onClose={onClose}>
      <h2 id={`${id}-title`} className="dialog__title">
        L’animal de {name}
      </h2>
      <div className="avatar-picker__preview">
        <Avatar player={{ name, ...value }} size="lg" />
      </div>
      <fieldset className="avatar-picker__group">
        <legend className="eyebrow">Animal</legend>
        <div className="avatar-picker__grid">
          {PLAYER_ANIMALS.map((a) => (
            <label key={a.id} className="avatar-choice">
              <input
                type="radio"
                name={`${id}-animal`}
                aria-label={a.id}
                checked={value.animal === a.id}
                onChange={() => choose({ ...value, animal: a.id })}
              />
              <span aria-hidden="true">{a.emoji}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="avatar-picker__group">
        <legend className="eyebrow">Couleur</legend>
        <div className="avatar-picker__grid">
          {PLAYER_COLORS.map((c) => (
            <label key={c} className="avatar-choice">
              <input
                type="radio"
                name={`${id}-color`}
                aria-label={COLOR_NAMES[c]}
                checked={value.color === c}
                onChange={() => choose({ ...value, color: c })}
              />
              <span className={`avatar-choice__swatch avatar--${c}`} aria-hidden="true" />
            </label>
          ))}
        </div>
      </fieldset>
      <Button block onClick={onClose}>
        C’est bon
      </Button>
    </Dialog>
  );
}
