import { useState } from 'react';
import { useObjectUrl } from '../deck/useObjectUrl';
import { GlyphView } from '../lettres/Glyph';
import type { ChoiceOption } from './choices';
import './choices.css';

function Photo({ image }: { image: Blob }) {
  const url = useObjectUrl(image);
  return url ? <img className="choice__photo" src={url} alt="" /> : null;
}

function Visual({ option }: { option: ChoiceOption }) {
  if (option.glyph)
    return (
      <GlyphView glyph={option.glyph} set={option.glyphSet ?? 'upper'} className="choice__glyph" />
    );
  if (option.image) return <Photo image={option.image} />;
  if (option.color) return <span className="choice__swatch" style={{ background: option.color }} />;
  if (option.emoji)
    return (
      <>
        <span className="choice__emoji">{option.emoji}</span>
        <span className="choice__caption">{option.label}</span>
      </>
    );
  return <span className="choice__text">{option.label}</span>;
}

/**
 * Les choix en grand. Toucher la bonne réponse la met en valeur ; un autre choix ne fait
 * rien (ni son, ni message) : l'enfant peut réessayer. Le parent valide toujours la manche.
 */
export function ChoiceBoard({ options, answer }: { options: ChoiceOption[]; answer: string }) {
  const [found, setFound] = useState(false);
  const right = options.find((o) => o.key === answer);
  return (
    <section className="choices round-in" aria-label="Choix de l’enfant">
      <div className={`choices__grid choices__grid--${options.length}`}>
        {options.map((o) => {
          const shown = found && o.key === answer;
          return (
            <button
              key={o.key}
              type="button"
              className={`choice${shown ? ' is-right' : ''}`}
              aria-label={o.label}
              onClick={() => o.key === answer && setFound(true)}
            >
              <span className="choice__visual" aria-hidden="true">
                <Visual option={o} />
              </span>
              {shown && (
                <span className="choice__mark" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="choices__status" role="status">
        {found && right ? `Oui, c’est ça : ${right.label} !` : ''}
      </p>
    </section>
  );
}
