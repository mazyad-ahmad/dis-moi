import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import type { PackItem } from '../../content/packs';
import { getSettings } from '../../data/settings';
import { cardLevel, drawForLevel } from '../levels';
import { Replayable } from '../Replayable';
import { useSavedDraw } from '../session';
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns } from '../useTurns';
import {
  NO_STAR_MESSAGE,
  RACONTE_CATEGORY,
  RACONTE_ID,
  RACONTE_NAME,
  CHAT_QUESTIONS,
  THANKS_LABEL,
} from './raconte';
import { chatTheme } from './themes';

const questionKey = (item: PackItem) => item.id;

/** Une question : son thème, le texte lu par le parent, et ce que fait le parent. */
export function ChatRound({ item }: { item: PackItem }) {
  const theme = chatTheme(item.tags);
  return (
    <div className="deck-round round-in">
      <section className="deck-card deck-card--question" aria-label="Question">
        <span className="word-card__label">
          {theme ? theme.name : 'Le parent lit à voix haute'}
        </span>
        <p className="deck-card__question">{item.answer}</p>
        <ReadAloud text={item.answer} />
      </section>
      <ParentBlock>
        <p>Pas de bonne réponse : l’enfant raconte, puis tu réponds à ton tour.</p>
        <p className="muted">Rien n’est enregistré, vos réponses restent entre vous.</p>
      </ParentBlock>
    </div>
  );
}

function RaconteSession({ onReplay }: { onReplay: () => void }) {
  const setting = useRoundSetting();
  const turns = useTurns(RACONTE_ID);
  // Tirage figé pour la partie (repris après un rafraîchissement), au niveau de la partie
  // ou, chacun son tour, au niveau de l'enfant de la manche.
  const items = useSavedDraw(
    RACONTE_ID,
    'draw',
    CHAT_QUESTIONS,
    () =>
      turns
        ? drawForTurns(
            CHAT_QUESTIONS,
            turns.levels(Math.min(setting, CHAT_QUESTIONS.length)),
            cardLevel,
          )
        : drawForLevel(CHAT_QUESTIONS, setting, getSettings().gameLevel, cardLevel),
    questionKey,
  );
  const { round, rounds, stars, finished, answer, team, teams } = useRounds(
    RACONTE_ID,
    items.length,
    turns?.order,
  );

  if (finished)
    return (
      <GameResult
        stars={stars}
        rounds={rounds}
        teams={teams}
        onReplay={onReplay}
        message={stars > 0 ? undefined : NO_STAR_MESSAGE}
      />
    );

  return (
    <main className="screen">
      <GameHeader
        round={round}
        rounds={rounds}
        stars={stars}
        category={RACONTE_CATEGORY}
        title={RACONTE_NAME}
        player={turns?.playerAt(round)}
        team={team}
      />
      {/* key : nouvelle manche = nouvelle question, qui entre en douceur. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <ChatRound key={round} item={items[round - 1]} />
      </TurnPlayer.Provider>
      <div className="spacer" />
      <AnswerBar
        onSkip={() => answer(false)}
        onFound={() => answer(true)}
        skipLabel="Passer"
        foundLabel={THANKS_LABEL}
      />
    </main>
  );
}

export function RaconteGame() {
  return <Replayable>{(replay) => <RaconteSession onReplay={replay} />}</Replayable>;
}
