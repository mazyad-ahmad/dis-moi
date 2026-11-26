import { useState } from 'react';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import { getSettings } from '../../data/settings';
import type { CatalogueGame } from '../catalogue/catalogue';
import '../choices/choices.css';
import { cardKey } from '../deck/cardKey';
import type { DeckItem } from '../deck/types';
import { writtenHints } from '../hints';
import { cardLevel, drawForLevel } from '../levels';
import { Replayable } from '../Replayable';
import { useSavedDraw } from '../session';
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns } from '../useTurns';
import { intrusGrid, SPOTS } from './intrus';
import './intrus.css';

export const INTRUS_QUESTION = 'Laquelle ne va pas avec les autres ?';

/**
 * Une manche : la question, la grille de quatre images et la zone du parent.
 * Toucher une image la met en avant, sans dire si c'est la bonne : le parent garde la main.
 * Aussi jouée dans le Grand Jeu et le Défi du jour.
 */
export function IntrusRound({ item }: { item: DeckItem }) {
  // Place de l'intrus tirée au hasard, figée pour la manche (remontée à chaque manche).
  const [grid] = useState(() => intrusGrid(item));
  const [shown, setShown] = useState<number>();
  return (
    <div className="deck-round round-in">
      <section className="deck-card deck-card--question intrus-card" aria-label="Question">
        <span className="word-card__label">Le parent lit à voix haute</span>
        <p className="deck-card__question">{INTRUS_QUESTION}</p>
        <ReadAloud text={INTRUS_QUESTION} />
      </section>

      <section className="choices" aria-label="Images">
        <div className="intrus-grid">
          {grid.images.map((emoji, i) => (
            <button
              key={i}
              type="button"
              className={`choice${shown === i ? ' is-shown' : ''}`}
              aria-pressed={shown === i}
              onClick={() => setShown(shown === i ? undefined : i)}
            >
              <span className="choice__emoji">{emoji}</span>
            </button>
          ))}
        </div>
        <p className="intrus-status muted" role="status">
          {shown === undefined ? '' : 'Pourquoi celle-là ? C’est le parent qui valide.'}
        </p>
      </section>

      <ParentBlock
        hidden={
          <>
            {item.emoji} {item.answer} ({SPOTS[grid.spot]})
            {item.text && <p className="parent-block__talk">{item.text}</p>}
          </>
        }
        hints={writtenHints(item)}
      >
        L’enfant montre l’intrus du doigt et dit pourquoi. Une autre bonne raison compte aussi :
        c’est toi qui valides.
      </ParentBlock>
    </div>
  );
}

function IntrusSession({ game, onReplay }: { game: CatalogueGame; onReplay: () => void }) {
  const setting = useRoundSetting();
  const turns = useTurns(game.id);
  // Tirage figé pour la partie, retrouvé après un rafraîchissement.
  // Chacun son tour (#38) : chaque carte au niveau de l'enfant de la manche.
  const items = useSavedDraw(
    game.id,
    'draw',
    game.items,
    () =>
      turns
        ? drawForTurns(game.items, turns.levels(Math.min(setting, game.items.length)), cardLevel)
        : drawForLevel(game.items, setting, getSettings().gameLevel, cardLevel),
    cardKey,
  );
  const { round, rounds, stars, finished, answer, team, teams } = useRounds(
    game.id,
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
        category={game.category}
        title={game.name}
        player={turns?.playerAt(round)}
        team={team}
      />
      {/* key : nouvelle manche = nouvelle grille, indices et réponse remis à zéro. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <IntrusRound key={round} item={item} />
      </TurnPlayer.Provider>
      <div className="spacer" />
      <AnswerBar onSkip={() => answer(false)} onFound={() => answer(true)} skipLabel="Pas encore" />
    </main>
  );
}

/** L'intrus (#63), jeu du catalogue avec son propre écran. */
export function IntrusGame({ game }: { game: CatalogueGame }) {
  return <Replayable>{(replay) => <IntrusSession game={game} onReplay={replay} />}</Replayable>;
}
