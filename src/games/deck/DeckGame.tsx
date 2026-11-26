import { useRecording } from '../../audio/recording';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { Mascot } from '../../components/Mascot';
import { IconEar, IconPause, IconPlay } from '../../components/icons';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import { ChoiceBoard } from '../choices/ChoiceBoard';
import { useChoices } from '../choices/useChoices';
import { deckChoicePool, deckOption, showsAnswer } from '../choices/choices';
import { DrawingGame } from '../dessin/DrawingGame';
import { hintLadder, writtenHints } from '../hints';
import { Replayable } from '../Replayable';
import { useSavedDraw } from '../session';
import { getSettings } from '../../data/settings';
import { cardLevel, drawForLevel } from '../levels';
import { useRoundSetting, useRounds } from '../useRounds';
import { cardKey } from './cardKey';
import type { Deck, DeckItem, DeckKind } from './types';
import { useObjectUrl } from './useObjectUrl';

/** Lecture d'un son enregistré par le parent, ramené au niveau commun de l'appli. */
function RecordedSound({ audio }: { audio: Blob }) {
  const { playing, toggle } = useRecording(audio);
  return (
    <>
      <button
        type="button"
        className="song-player__play"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Écouter le son'}
      >
        {playing ? <IconPause size={40} /> : <IconPlay size={40} />}
      </button>
      <span role="status">Fais écouter le son à l’enfant</span>
    </>
  );
}

export function SoundCard({ item }: { item: DeckItem }) {
  return (
    <section className="song-player" aria-label="Son">
      {item.audio ? (
        <RecordedSound audio={item.audio} />
      ) : (
        <>
          <span className="deck-card__ear" aria-hidden="true">
            <IconEar size={56} />
          </span>
          <span role="status">Le parent fait le bruit, l’enfant devine</span>
        </>
      )}
    </section>
  );
}

export function ImageCard({ item }: { item: DeckItem }) {
  const url = useObjectUrl(item.image);
  return (
    <figure className="deck-card deck-card--image">
      {item.image ? (
        url && <img className="deck-card__photo" src={url} alt="Image à montrer" />
      ) : item.color ? (
        <span
          className="deck-card__swatch"
          role="img"
          aria-label="Couleur à nommer"
          style={{ background: item.color }}
        />
      ) : item.emoji ? (
        <span className="deck-card__emoji" role="img" aria-label="Image à montrer">
          {item.emoji}
        </span>
      ) : null}
      {item.text && <strong className="deck-card__text">{item.text}</strong>}
      <figcaption className="muted">Montre l'écran à l'enfant</figcaption>
    </figure>
  );
}

export function QuestionCard({ item }: { item: DeckItem }) {
  return (
    <section className="deck-card deck-card--question" aria-label="Question">
      <span className="word-card__label">Le parent lit à voix haute</span>
      <p className="deck-card__question">{item.text}</p>
      {item.text && <ReadAloud text={item.text} />}
    </section>
  );
}

function answerOf(item: DeckItem) {
  return item.emoji && !item.color ? `${item.emoji} ${item.answer}` : item.answer;
}

/**
 * Une manche : la carte et la zone du parent (aussi jouée dans le Grand Jeu).
 * `pool` : cartes du jeu où tirer les choix de « Répondre en montrant » (#123).
 */
export function DeckRound({
  kind,
  item,
  pool,
}: {
  kind: DeckKind;
  item: DeckItem;
  pool?: readonly DeckItem[];
}) {
  const soundToImitate = kind === 'sound' && !item.audio && item.text;
  const choices = useChoices(pool && deckOption(item), pool?.map(deckOption));
  // L'enfant verrait la réponse (couleur, photo) : les choix la remplacent, le parent la demande.
  const showMe = !!choices && showsAnswer(kind);
  return (
    <div className="deck-round round-in">
      {kind === 'sound' && <SoundCard item={item} />}
      {kind === 'image' && !showMe && <ImageCard item={item} />}
      {kind === 'question' && <QuestionCard item={item} />}
      {choices && <ChoiceBoard options={choices} answer={deckOption(item).key} />}
      {showMe ? (
        <ParentBlock>
          Demande à l’enfant de montrer : <strong>{item.answer}</strong>
        </ParentBlock>
      ) : (
        /* Premier indice écrit visible d'emblée, les suivants à la demande. */
        <ParentBlock
          hidden={answerOf(item)}
          hints={hintLadder(item)}
          openHints={writtenHints(item).length ? 1 : 0}
        >
          {soundToImitate && (
            <>
              À imiter : <strong>{item.text}</strong>
            </>
          )}
        </ParentBlock>
      )}
    </div>
  );
}

function DeckSession({ deck, onReplay }: { deck: Deck; onReplay: () => void }) {
  const setting = useRoundSetting();
  // Tirage figé pour la partie, même si le jeu est modifié entre-temps ou la page rafraîchie.
  const items = useSavedDraw(
    deck.id,
    'draw',
    deck.items,
    () => drawForLevel(deck.items, setting, getSettings().gameLevel, cardLevel),
    cardKey,
  );
  const { round, rounds, stars, finished, answer } = useRounds(deck.id, items.length);

  if (finished) return <GameResult stars={stars} rounds={rounds} onReplay={onReplay} />;

  const item = items[round - 1];
  return (
    <main className="screen">
      <GameHeader
        round={round}
        rounds={rounds}
        stars={stars}
        category={deck.category}
        title={deck.name}
      />
      {/* key : nouvelle manche = carte et réponse remises à zéro. */}
      <DeckRound key={round} kind={deck.kind} item={item} pool={deckChoicePool(deck)} />
      <div className="spacer" />
      <AnswerBar
        onSkip={() => answer(false)}
        onFound={() => answer(true)}
        skipLabel={deck.kind === 'question' ? 'Pas encore' : 'Passer'}
      />
    </main>
  );
}

function EmptyDeck({ deck }: { deck: Deck }) {
  return (
    <main className="screen">
      <GameHeader category={deck.category} title={deck.name} />
      <div className="empty">
        <Mascot mood="think" />
        <strong>Ce jeu n’a pas encore de carte</strong>
        <span className="muted">Ajoute des questions depuis « Ajouter un jeu ».</span>
      </div>
    </main>
  );
}

/** Joue n'importe quel jeu au format commun (catalogue ou jeu créé). */
export function DeckGame({ deck }: { deck: Deck }) {
  if (!deck.items.length) return <EmptyDeck deck={deck} />;
  if (deck.kind === 'draw')
    return (
      <DrawingGame
        gameId={deck.id}
        category={deck.category}
        title={deck.name}
        words={deck.items.map((i) => i.answer)}
        levelOf={(word) => cardLevel(deck.items.find((i) => i.answer === word) ?? {})}
      />
    );
  return <Replayable>{(replay) => <DeckSession deck={deck} onReplay={replay} />}</Replayable>;
}
