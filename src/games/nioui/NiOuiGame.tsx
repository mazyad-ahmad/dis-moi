import { useState } from 'react';
import { Button } from '../../components/Button';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import { useStarFlight } from '../../components/StarFlight';
import { getSettings } from '../../data/settings';
import type { CatalogueGame } from '../catalogue/catalogue';
import { cardKey } from '../deck/cardKey';
import type { DeckItem } from '../deck/types';
import { cardLevel, drawForLevel } from '../levels';
import { Replayable } from '../Replayable';
import { useSaved, useSavedDraw } from '../session';
import { useRounds } from '../useRounds';
import { TurnPlayer, useTurns } from '../useTurns';
import {
  ANSWERERS,
  ASKER_LINE,
  HOLD_GOAL,
  isAnswerer,
  isTrick,
  restorePace,
  RULE_LINE,
  SLIP_LINE,
  step,
  type Answerer,
  type Pace,
} from './nioui';
import './nioui.css';

/** Questions tenues dans la manche : des pastilles, pas de minuteur. */
function Held({ held }: { held: number }) {
  return (
    <p className="nioui-held" aria-live="polite">
      <span className="nioui-held__dots" aria-hidden="true">
        {Array.from({ length: HOLD_GOAL }, (_, i) => (
          <span key={i} className={i < held ? 'is-held' : undefined} />
        ))}
      </span>
      <span>
        Tenu : <strong>{held}</strong> sur {HOLD_GOAL}
      </span>
    </p>
  );
}

/** Une question : qui la pose, le texte, et la zone du parent. */
export function NiOuiQuestion({ item, answerer }: { item: DeckItem; answerer: Answerer }) {
  return (
    <>
      <section className="deck-card deck-card--question" aria-label="Question">
        <span className="word-card__label">{ASKER_LINE[answerer]}</span>
        <p className="deck-card__question">{item.text}</p>
        {item.text && <ReadAloud text={item.text} />}
      </section>
      <ParentBlock hidden={<>« {item.answer} »</>} revealLabel="Une idée de réponse">
        {isTrick(item) && <p className="nioui-rule nioui-trick">Question piège !</p>}
        <p className="nioui-rule">{RULE_LINE[answerer]}</p>
        <p className="nioui-rule muted">Une étoile après {HOLD_GOAL} questions tenues.</p>
      </ParentBlock>
    </>
  );
}

function NiOuiSession({ game, onReplay }: { game: CatalogueGame; onReplay: () => void }) {
  const turns = useTurns(game.id);
  // Toutes les questions, mélangées une fois pour la partie (niveau de la partie d'abord).
  const items = useSavedDraw(
    game.id,
    'draw',
    game.items,
    () => drawForLevel(game.items, game.items.length, getSettings().gameLevel, cardLevel),
    cardKey,
  );
  const { round, rounds, stars, finished, answer, team, teams } = useRounds(
    game.id,
    undefined,
    turns?.order,
  );
  const [pace, setPace] = useSaved<Pace>(
    game.id,
    'pace',
    () => ({ next: 0, held: 0 }),
    (saved) => restorePace(saved, items.length),
  );
  const [answerer, setAnswerer] = useSaved<Answerer>(
    game.id,
    'answerer',
    () => 'child',
    (saved) => (isAnswerer(saved) ? saved : undefined),
  );
  const [slipped, setSlipped] = useState(false);
  const flight = useStarFlight();

  if (finished)
    return <GameResult stars={stars} rounds={rounds} teams={teams} onReplay={onReplay} />;

  const respond = (held: boolean, from: Element | null) => {
    const { pace: next, done } = step(pace, held, items.length);
    setPace(next);
    setSlipped(!held);
    if (!done) return;
    if (done.star) flight.launch(from);
    answer(done.star);
  };

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
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        {/* key : nouvelle question = zone du parent refermée. */}
        <div key={pace.next} className="deck-round round-in">
          {pace.held === 0 && (
            <>
              {slipped && (
                <p className="nioui-slip" role="status">
                  {SLIP_LINE}
                </p>
              )}
              <div className="segmented segmented--2" role="radiogroup" aria-label="Qui répond ?">
                {ANSWERERS.map((a) => (
                  <label key={a.value}>
                    <input
                      type="radio"
                      name="nioui-answerer"
                      value={a.value}
                      checked={answerer === a.value}
                      onChange={() => setAnswerer(a.value)}
                    />
                    {a.label} répond
                  </label>
                ))}
              </div>
            </>
          )}
          <NiOuiQuestion item={items[pace.next]} answerer={answerer} />
          <Held held={pace.held} />
        </div>
      </TurnPlayer.Provider>
      <div className="spacer" />
      <div className="answer-bar">
        <Button variant="secondary" onClick={(e) => respond(false, e.currentTarget)}>
          Oups, un oui ou un non
        </Button>
        <Button onClick={(e) => respond(true, e.currentTarget)}>Tenu !</Button>
        {flight.stars}
      </div>
    </main>
  );
}

/** Ni oui ni non (#135), jeu du catalogue avec son propre écran. */
export function NiOuiGame({ game }: { game: CatalogueGame }) {
  return <Replayable>{(replay) => <NiOuiSession game={game} onReplay={replay} />}</Replayable>;
}
