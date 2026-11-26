import { useState } from 'react';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import { getSettings } from '../../data/settings';
import type { CatalogueGame } from '../catalogue/catalogue';
import { cardKey } from '../deck/cardKey';
import { TalkAbout } from '../deck/DeckGame';
import type { DeckItem } from '../deck/types';
import { cardLevel, drawForLevel } from '../levels';
import { Replayable } from '../Replayable';
import { useSavedDraw } from '../session';
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns } from '../useTurns';
import {
  IDEAS_LABEL,
  ideasOf,
  NO_STAR_MESSAGE,
  PARENT_LINE,
  SITUATION_QUESTION,
  situationSpeech,
  situationsFor,
  THANKS_LABEL,
} from './situation';
import './situation.css';

/** Une situation : lue par le parent, avec des pistes et une question pour en parler. */
export function SituationRound({ item }: { item: DeckItem }) {
  return (
    <div className="deck-round round-in">
      <section className="deck-card deck-card--question" aria-label="Situation">
        <span className="word-card__label">Le parent lit à voix haute</span>
        {item.emoji && (
          <span className="situation-emoji" aria-hidden="true">
            {item.emoji}
          </span>
        )}
        <p className="deck-card__question">{item.text}</p>
        <p className="deck-card__question">{SITUATION_QUESTION}</p>
        <ReadAloud text={situationSpeech(item)} />
      </section>
      <ParentBlock
        revealLabel={IDEAS_LABEL}
        hidden={
          <>
            <ul className="situation-ideas" aria-label="Pistes">
              {ideasOf(item).map((idea) => (
                <li key={idea}>{idea}</li>
              ))}
            </ul>
            <TalkAbout item={item} />
          </>
        }
      >
        <p>{PARENT_LINE}</p>
      </ParentBlock>
    </div>
  );
}

function SituationSession({ game, onReplay }: { game: CatalogueGame; onReplay: () => void }) {
  const setting = useRoundSetting();
  const turns = useTurns(game.id);
  const [items] = useState(() => situationsFor(game.items, getSettings().gameMode));
  // Tirage figé pour la partie (repris après un rafraîchissement), au niveau de la partie
  // ou, chacun son tour, au niveau de l'enfant de la manche.
  const drawn = useSavedDraw(
    game.id,
    'draw',
    items,
    () =>
      turns
        ? drawForTurns(items, turns.levels(Math.min(setting, items.length)), cardLevel)
        : drawForLevel(items, setting, getSettings().gameLevel, cardLevel),
    cardKey,
  );
  const { round, rounds, stars, finished, answer, team, teams } = useRounds(
    game.id,
    drawn.length,
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
        category={game.category}
        title={game.name}
        player={turns?.playerAt(round)}
        team={team}
      />
      {/* key : nouvelle manche = nouvelle situation, pistes refermées. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <SituationRound key={round} item={drawn[round - 1]} />
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

export function SituationGame({ game }: { game: CatalogueGame }) {
  return <Replayable>{(replay) => <SituationSession game={game} onReplay={replay} />}</Replayable>;
}
