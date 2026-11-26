import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import { ChoiceBoard } from '../choices/ChoiceBoard';
import { useChoiceCount } from '../choices/useChoices';
import type { DeckItem } from '../deck/types';
import { writtenHints } from '../hints';
import { familyOptions, triOf, triQuestion, type TriCard } from './tri';
import './tri.css';

/** Réponse du parent : la ou les familles, puis la phrase d'explication. */
function TriAnswer({ item, tri }: { item: DeckItem; tri: TriCard }) {
  return (
    <>
      {tri.accepted.map((f) => `${f.emoji} ${f.label}`).join(' ou ')}
      {tri.debatable && ' : les deux se disent'}
      {item.text && <p className="parent-block__talk">{item.text}</p>}
    </>
  );
}

/**
 * Une manche d'« Où ça va ? » (#130) : l'élément en grand, la question et les familles.
 * Avec « Répondre en montrant » (#123), les familles se touchent ; une carte discutable
 * accepte chacune de ses familles. Le parent valide toujours, une autre bonne raison compte.
 * Jouée aussi dans le Grand Jeu et le Défi du jour.
 */
export function TriRound({ item }: { item: DeckItem }) {
  const tri = triOf(item)!;
  const question = triQuestion(item, tri.theme);
  const options = familyOptions(tri.theme);
  const showChoices = useChoiceCount() > 0;
  const hints = writtenHints(item);
  return (
    <div className="deck-round round-in">
      <section className="deck-card deck-card--question tri-card" aria-label="Question">
        {item.emoji && (
          <span className="tri-card__emoji" aria-hidden="true">
            {item.emoji}
          </span>
        )}
        <strong className="tri-card__word">{item.answer}</strong>
        <span className="word-card__label">Le parent lit à voix haute</span>
        <p className="deck-card__question">{question}</p>
        <ReadAloud text={question} />
      </section>
      {showChoices ? (
        <ChoiceBoard options={options} answer={tri.accepted.map((f) => f.key)} />
      ) : (
        <ul className={`tri-families tri-families--${options.length}`} aria-label="Familles">
          {options.map((o) => (
            <li key={o.key} className="tri-family">
              <span className="tri-family__emoji" aria-hidden="true">
                {o.emoji}
              </span>
              {o.label}
            </li>
          ))}
        </ul>
      )}
      <ParentBlock
        hidden={<TriAnswer item={item} tri={tri} />}
        hints={hints}
        openHints={hints.length ? 1 : 0}
      >
        {tri.debatable ? (
          <>
            <strong>Carte discutable :</strong> plusieurs réponses vont. Écoute pourquoi et accepte
            celle que l’enfant explique.
          </>
        ) : (
          'L’enfant dit où ça va et pourquoi. Une autre bonne raison compte aussi : c’est toi qui valides.'
        )}
      </ParentBlock>
    </div>
  );
}
