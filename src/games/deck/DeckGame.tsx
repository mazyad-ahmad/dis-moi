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
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns } from '../useTurns';
import { cardKey } from './cardKey';
import type { Deck, DeckItem, DeckKind } from './types';
import { useObjectUrl } from './useObjectUrl';
import { VERDICT_OPTIONS, verdictOf, verdictOption } from '../vraifaux/verdict';
import { consigneOf } from '../jacques/consigne';
import { JacquesCue } from '../jacques/JacquesCue';

/** Lecture d'un son enregistré par le parent, ramené au niveau commun de l'appli. */
function RecordedSound({ audio }: { audio: Blob }) {
  const { playing, failed, toggle } = useRecording(audio);
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
      <span role="status">
        {failed
          ? 'Le son ne s’est pas lancé. Touche encore le bouton, ou fais le bruit toi-même.'
          : 'Fais écouter le son à l’enfant'}
      </span>
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

/** Question pour en parler ensemble (#58), sous la réponse du parent. */
export function TalkAbout({ item }: { item: DeckItem }) {
  return item.talk ? (
    <p className="parent-block__talk">
      Pour en parler : <strong>{item.talk}</strong>
    </p>
  ) : null;
}

/** Réponse cachée d'une carte, avec sa question pour en parler s'il y en a une. */
export function DeckAnswer({ item }: { item: DeckItem }) {
  return (
    <>
      {answerOf(item)}
      <TalkAbout item={item} />
    </>
  );
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
  // Jacques a dit (#57) : piège ou pas, dit d'emblée au parent ; rien à montrer à l'enfant.
  const consigne = kind === 'question' ? consigneOf(item) : undefined;
  // Vrai ou faux (#56) : deux choix, Vrai puis Faux, à la place des cartes voisines.
  const verdict = kind === 'question' ? verdictOf(item.answer) : undefined;
  const drawn = useChoices(
    pool && !consigne ? (verdict ? verdictOption(verdict) : deckOption(item)) : undefined,
    verdict ? VERDICT_OPTIONS : pool?.map(deckOption),
  );
  const choices = drawn && verdict ? [...VERDICT_OPTIONS] : drawn;
  // L'enfant verrait la réponse (couleur, photo) : les choix la remplacent, le parent la demande.
  const showMe = !!choices && showsAnswer(kind);
  return (
    <div className="deck-round round-in">
      {kind === 'sound' && <SoundCard item={item} />}
      {kind === 'image' && !showMe && <ImageCard item={item} />}
      {kind === 'question' && <QuestionCard item={item} />}
      {choices && <ChoiceBoard options={choices} answer={verdict ?? deckOption(item).key} />}
      {consigne ? (
        <JacquesCue consigne={consigne} />
      ) : showMe ? (
        <ParentBlock>
          Demande à l’enfant de montrer : <strong>{item.answer}</strong>
          <TalkAbout item={item} />
        </ParentBlock>
      ) : (
        /* Premier indice écrit visible d'emblée, les suivants à la demande. */
        <ParentBlock
          hidden={<DeckAnswer item={item} />}
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
  const turns = useTurns(deck.id);
  // Tirage figé pour la partie, même si le jeu est modifié entre-temps ou la page rafraîchie.
  // Chacun son tour (#38) : chaque carte au niveau de l'enfant de la manche.
  const items = useSavedDraw(
    deck.id,
    'draw',
    deck.items,
    () =>
      turns
        ? drawForTurns(deck.items, turns.levels(Math.min(setting, deck.items.length)), cardLevel)
        : drawForLevel(deck.items, setting, getSettings().gameLevel, cardLevel),
    cardKey,
  );
  const { round, rounds, stars, finished, answer, team, teams } = useRounds(
    deck.id,
    items.length,
    turns?.order,
  );

  if (finished)
    return <GameResult stars={stars} rounds={rounds} teams={teams} onReplay={onReplay} />;

  const item = items[round - 1];
  return (
    <main className="screen">
      <GameHeader
        round={round}
        rounds={rounds}
        stars={stars}
        category={deck.category}
        title={deck.name}
        player={turns?.playerAt(round)}
        team={team}
      />
      {/* key : nouvelle manche = carte et réponse remises à zéro. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <DeckRound key={round} kind={deck.kind} item={item} pool={deckChoicePool(deck)} />
      </TurnPlayer.Provider>
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
