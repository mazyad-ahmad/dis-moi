import { useState } from 'react';
import { AnswerBar } from '../../components/AnswerBar';
import { Button } from '../../components/Button';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import { getSettings } from '../../data/settings';
import type { CatalogueGame } from '../catalogue/catalogue';
import { cardKey } from '../deck/cardKey';
import type { DeckItem } from '../deck/types';
import { cardLevel, drawForLevel } from '../levels';
import { Replayable } from '../Replayable';
import { useSaved } from '../session';
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns, type Turns } from '../useTurns';
import {
  GUESSER_LINE,
  GUESSERS,
  isGuesser,
  MAINS_MAX,
  PARENT_LINE,
  PREPARE_LINE,
  roundQuestions,
  SAFETY_RULES,
  STEPS,
  type Guesser,
} from './mains';
import './mains.css';

/** Avant la première manche : le rappel de sécurité, qui devine, puis la liste des objets. */
function MainsIntro({
  items,
  guesser,
  onGuesser,
  onOtherList,
  onStart,
}: {
  items: DeckItem[];
  guesser: Guesser;
  onGuesser: (guesser: Guesser) => void;
  onOtherList: () => void;
  onStart: () => void;
}) {
  return (
    <div className="mains-intro">
      <section className="mains-safety" role="note" aria-label="Sécurité d’abord">
        <h2 className="mains-intro__title">⚠️ Sécurité d’abord</h2>
        <ul>
          {SAFETY_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <div className="segmented segmented--2" role="radiogroup" aria-label="Qui devine ?">
        {GUESSERS.map((g) => (
          <label key={g.value}>
            <input
              type="radio"
              name="mains-guesser"
              value={g.value}
              checked={guesser === g.value}
              onChange={() => onGuesser(g.value)}
            />
            {g.label} devine
          </label>
        ))}
      </div>

      <section className="mains-list" aria-label="Dans le sac">
        <h2 className="mains-intro__title">Dans le sac</h2>
        <ul>
          {items.map((item) => (
            <li key={item.id ?? item.answer}>
              <span aria-hidden="true">{item.emoji}</span> {item.answer}
            </li>
          ))}
        </ul>
        <p className="muted">{PREPARE_LINE[guesser]}</p>
      </section>

      <div className="mains-intro__actions">
        <Button onClick={onStart}>C’est parti</Button>
        <Button variant="secondary" onClick={onOtherList}>
          Une autre liste
        </Button>
      </div>
    </div>
  );
}

/** Une manche : trois étapes courtes, les questions pour décrire dans la zone du parent. */
export function MainsRound({ round, guesser }: { round: number; guesser: Guesser }) {
  return (
    <div className="deck-round round-in">
      <section className="deck-card mains-card" aria-label="Manche">
        <span className="word-card__label">{GUESSER_LINE[guesser]}</span>
        <ol className="mains-steps">
          {STEPS.map((step) => (
            <li key={step.text}>
              <span className="mains-steps__emoji" aria-hidden="true">
                {step.emoji}
              </span>
              {step.text}
            </li>
          ))}
        </ol>
        <ReadAloud text={STEPS.map((s) => s.text).join(' ')} />
      </section>
      <ParentBlock>
        <p>{PARENT_LINE[guesser]}</p>
        <ul className="mains-questions">
          {roundQuestions(round).map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </ParentBlock>
    </div>
  );
}

/** Objets de la liste, chacun au niveau de la partie (ou de l'enfant de la manche). */
function drawList(game: CatalogueGame, count: number, turns: Turns | null): DeckItem[] {
  return turns
    ? drawForTurns(game.items, turns.levels(count), cardLevel)
    : drawForLevel(game.items, count, getSettings().gameLevel, cardLevel);
}

function MainsSession({ game, onReplay }: { game: CatalogueGame; onReplay: () => void }) {
  const setting = useRoundSetting();
  const turns = useTurns(game.id);
  const count = Math.min(setting, MAINS_MAX, game.items.length);
  const byKey = new Map(game.items.map((item, i) => [cardKey(item, i), item]));
  const keysOf = (items: DeckItem[]) =>
    items.map((item) => cardKey(item, game.items.indexOf(item)));
  // Liste figée pour la partie, retrouvée après un rafraîchissement ; « Une autre liste » la change.
  const [keys, setKeys] = useSaved<string[]>(
    game.id,
    'draw',
    () => keysOf(drawList(game, count, turns)),
    (saved) =>
      Array.isArray(saved) &&
      saved.length === count &&
      saved.every((k) => typeof k === 'string' && byKey.has(k))
        ? (saved as string[])
        : undefined,
  );
  const items = keys.map((k) => byKey.get(k)!);
  const { round, rounds, stars, finished, answer, team, teams } = useRounds(
    game.id,
    items.length,
    turns?.order,
  );
  const restoreGuesser = (saved: unknown) => (isGuesser(saved) ? saved : undefined);
  const [guesser, setGuesser] = useSaved<Guesser>(
    game.id,
    'guesser',
    () => 'child',
    restoreGuesser,
  );
  // Le rappel de sécurité revient à chaque lancement ; une partie entamée ne le remontre pas.
  const [started, setStarted] = useState(round > 1);

  if (finished)
    return <GameResult stars={stars} rounds={rounds} teams={teams} onReplay={onReplay} />;

  const otherList = () => {
    // Une liste neuve, autant que possible sans les objets de la précédente.
    const fresh = drawList(
      { ...game, items: game.items.filter((item) => !items.includes(item)) },
      count,
      turns,
    );
    const next = fresh.length === count ? fresh : drawList(game, count, turns);
    setKeys(keysOf(next));
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
      {started ? (
        <>
          <TurnPlayer.Provider value={turns?.playerAt(round)}>
            {/* key : nouvelle manche = nouvelles questions. */}
            <MainsRound key={round} round={round} guesser={guesser} />
          </TurnPlayer.Provider>
          <div className="spacer" />
          <AnswerBar
            onSkip={() => answer(false)}
            onFound={() => answer(true)}
            skipLabel="Pas encore"
          />
        </>
      ) : (
        <MainsIntro
          items={items}
          guesser={guesser}
          onGuesser={setGuesser}
          onOtherList={otherList}
          onStart={() => setStarted(true)}
        />
      )}
    </main>
  );
}

/** Devine avec tes mains (#134), jeu du catalogue avec son propre écran. */
export function MainsGame({ game }: { game: CatalogueGame }) {
  return <Replayable>{(replay) => <MainsSession game={game} onReplay={replay} />}</Replayable>;
}
