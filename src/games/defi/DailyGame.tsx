import { useRef, useState } from 'react';
import { href, navigate } from '../../app/router';
import { answerSound, playSound, soundLength } from '../../audio/sounds';
import { AnswerBar } from '../../components/AnswerBar';
import { Confetti } from '../../components/Confetti';
import { GameHeader } from '../../components/GameHeader';
import { IconTrash } from '../../components/icons';
import { Mascot } from '../../components/Mascot';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import { listRecords, REWARDS, startRecord, totalStars, useRecords } from '../../data/history';
import { getSettings, useSettings } from '../../data/settings';
import { vibrate } from '../../pwa/haptics';
import { praise } from '../../voice/praise';
import { NotFound } from '../../screens/Placeholder';
import { SongRound } from '../chanson/SongGame';
import { DeckAnswer, ImageCard, QuestionCard, SoundCard } from '../deck/DeckGame';
import { DrawingCanvas, type DrawingCanvasHandle } from '../dessin/DrawingCanvas';
import { hintLadder, writtenHints } from '../hints';
import { TreasureRound } from '../tresor/TreasureGame';
import { TREASURE_ID, treasureWay } from '../tresor/treasure';
import {
  DAILY_ID,
  DAILY_NAME,
  dailyDone,
  dailyPick,
  dayKey,
  kindWord,
  type DailyCard,
} from './daily';

/** Mot à dessiner : sans minuteur, l'enfant prend son temps. */
function DrawCard({ word }: { word: string }) {
  const canvas = useRef<DrawingCanvasHandle>(null);
  return (
    <>
      <section className="word-card" aria-label="Mot à dessiner">
        <div>
          <span className="word-card__label">Le parent lit à voix haute</span>
          <strong className="word-card__word">{word}</strong>
          <ReadAloud text={word} />
        </div>
      </section>
      <div className="drawing-area">
        <DrawingCanvas ref={canvas} color="var(--ink)" />
        <span className="drawing-area__hint muted">L'enfant dessine avec le doigt</span>
      </div>
      <div className="pen-bar">
        <span />
        <button
          type="button"
          className="icon-btn"
          aria-label="Tout effacer"
          onClick={() => canvas.current?.clear()}
        >
          <IconTrash size={20} />
        </button>
      </div>
    </>
  );
}

function CardBody({ card }: { card: DailyCard }) {
  switch (card.kind) {
    case 'melody':
      return <SongRound song={card.song} />;
    case 'glyph':
      return (
        <>
          <figure className="glyph-card">
            <span className="glyph-card__glyph" data-testid="glyph">
              {card.card.glyph}
            </span>
            <figcaption className="muted">Montre l'écran à l'enfant</figcaption>
          </figure>
          <ParentBlock>
            {card.card.hint}
            <ReadAloud text={card.card.hint} />
          </ParentBlock>
        </>
      );
    case 'draw':
      return <DrawCard word={card.word} />;
    default: {
      const { item } = card;
      return (
        <div className="deck-round">
          {card.kind === 'sound' && <SoundCard item={item} />}
          {card.kind === 'image' && <ImageCard item={item} />}
          {card.kind === 'question' && <QuestionCard item={item} />}
          <ParentBlock
            hidden={<DeckAnswer item={item} />}
            hints={hintLadder(item)}
            openHints={writtenHints(item).length ? 1 : 0}
          >
            {card.kind === 'sound' && item.text && (
              <>
                À imiter : <strong>{item.text}</strong>
              </>
            )}
          </ParentBlock>
        </div>
      );
    }
  }
}

/** Défi réussi : l'étoile bonus et un mot gentil. Rien d'autre à faire aujourd'hui. */
function DailyDone({ day, party }: { day: string; party: boolean }) {
  return (
    <main className="screen result">
      {party && <Confetti />}
      <Mascot mood="bravo" size={96} />
      <h1 className="h1">Défi réussi !</h1>
      <p className="lead">Une étoile bonus gagnée ensemble.</p>
      <p className="lead">{kindWord(day)}</p>
      <p className="muted">Une nouvelle surprise vous attend demain.</p>
      <div className="spacer" />
      <a className="btn btn--primary btn--block" href={href('/')}>
        Accueil
      </a>
    </main>
  );
}

/** Une seule carte, une étoile bonus si elle est trouvée ; « Pas encore » ramène à l'accueil. */
function DailyRound({ day }: { day: string }) {
  const [done, setDone] = useState(false);
  const saving = useRef(false);
  const { source, card } = dailyPick(day);

  if (done) return <DailyDone day={day} party />;

  const found = async () => {
    if (saving.current) return;
    saving.current = true;
    const total = totalStars(await listRecords().catch(() => [])) + 1;
    await startRecord({ gameId: DAILY_ID, rounds: 1, played: 1, stars: 1 });
    const sound = answerSound(true, true, total, REWARDS);
    void playSound(sound);
    praise({ afterMs: getSettings().sounds ? soundLength(sound) * 1000 + 150 : 0 });
    vibrate('found');
    setDone(true);
  };

  return (
    <main className="screen">
      <GameHeader category={DAILY_NAME} title={source.name} />
      <p className="muted">Une carte surprise, la même toute la journée.</p>
      {source.game === TREASURE_ID && card.kind === 'question' ? (
        <TreasureRound
          item={card.item}
          way={treasureWay('run', getSettings().gameMode)}
          seconds={0}
        />
      ) : (
        <CardBody card={card} />
      )}
      <div className="spacer" />
      <AnswerBar
        onSkip={() => navigate('/')}
        onFound={() => void found()}
        skipLabel="Pas encore"
        foundLabel={card.kind === 'draw' ? "C'est fini" : 'Trouvé'}
      />
    </main>
  );
}

/** Écran du défi du jour (#/jeu/defi). */
export function DailyGame() {
  const { dailyChallenge } = useSettings();
  // Jour figé à l'ouverture : la carte ne change pas sous les yeux à minuit.
  const [day] = useState(() => dayKey());
  const records = useRecords();
  const [doneAtStart, setDoneAtStart] = useState<boolean>();
  if (records !== undefined && doneAtStart === undefined) setDoneAtStart(dailyDone(records, day));

  if (!dailyChallenge) return <NotFound />;
  if (doneAtStart === undefined) return <main className="screen" />;
  if (doneAtStart) return <DailyDone day={day} party={false} />;
  return <DailyRound day={day} />;
}
