import { useEffect, useRef, useState } from 'react';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { IconEar, IconPause, IconPlay } from '../../components/icons';
import { ParentBlock } from '../../components/ParentBlock';
import { DrawingGame } from '../dessin/DrawingGame';
import { Replayable } from '../Replayable';
import { useSavedDraw } from '../session';
import { shuffle } from '../shuffle';
import { useRoundSetting, useRounds } from '../useRounds';
import type { Deck, DeckItem } from './types';
import { useObjectUrl } from './useObjectUrl';

/** Lecture d'un son enregistré par le parent. */
function RecordedSound({ audio }: { audio: Blob }) {
  const url = useObjectUrl(audio);
  const el = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => el.current?.pause(), []);

  const toggle = () => {
    const a = el.current;
    if (!a) return;
    if (playing) a.pause();
    else {
      a.currentTime = 0;
      void a.play().catch(() => setPlaying(false));
    }
  };

  return (
    <>
      <audio
        ref={el}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
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

function SoundCard({ item }: { item: DeckItem }) {
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

function ImageCard({ item }: { item: DeckItem }) {
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

function QuestionCard({ item }: { item: DeckItem }) {
  return (
    <section className="deck-card deck-card--question" aria-label="Question">
      <span className="word-card__label">Le parent lit à voix haute</span>
      <p className="deck-card__question">{item.text}</p>
    </section>
  );
}

/**
 * Clé d'une carte dans le tirage sauvegardé. Les cartes créées n'ont pas d'identifiant :
 * position et réponse, pour qu'un jeu modifié entre-temps donne une nouvelle partie.
 */
function cardKey(item: DeckItem, index: number) {
  return item.id ?? `${index}:${item.answer}`;
}

function answerOf(item: DeckItem) {
  return item.emoji && !item.color ? `${item.emoji} ${item.answer}` : item.answer;
}

function DeckSession({ deck, onReplay }: { deck: Deck; onReplay: () => void }) {
  const setting = useRoundSetting();
  // Tirage figé pour la partie, même si le jeu est modifié entre-temps ou la page rafraîchie.
  const items = useSavedDraw(
    deck.id,
    'draw',
    deck.items,
    () => shuffle(deck.items).slice(0, setting),
    cardKey,
  );
  const { round, rounds, stars, finished, answer } = useRounds(deck.id, items.length);

  if (finished) return <GameResult stars={stars} rounds={rounds} onReplay={onReplay} />;

  const item = items[round - 1];
  const soundToImitate = deck.kind === 'sound' && !item.audio && item.text;
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
      <div key={round} className="deck-round round-in">
        {deck.kind === 'sound' && <SoundCard item={item} />}
        {deck.kind === 'image' && <ImageCard item={item} />}
        {deck.kind === 'question' && <QuestionCard item={item} />}
        <ParentBlock hidden={answerOf(item)}>
          {soundToImitate && (
            <>
              À imiter : <strong>{item.text}</strong>
              <br />
            </>
          )}
          {item.hint && <>Indice : {item.hint}</>}
        </ParentBlock>
      </div>
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
      />
    );
  return <Replayable>{(replay) => <DeckSession deck={deck} onReplay={replay} />}</Replayable>;
}
