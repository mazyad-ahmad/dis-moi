import { useState } from 'react';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import { getSettings } from '../../data/settings';
import type { CatalogueGame } from '../catalogue/catalogue';
import { ChoiceBoard } from '../choices/ChoiceBoard';
import type { ChoiceOption } from '../choices/choices';
import { useChoiceCount } from '../choices/useChoices';
import { cardKey } from '../deck/cardKey';
import type { DeckItem } from '../deck/types';
import { cardLevel, drawForLevel } from '../levels';
import { Replayable } from '../Replayable';
import { useSavedDraw } from '../session';
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns } from '../useTurns';
import {
  cellEmoji,
  cellKey,
  cellName,
  makeSuite,
  suiteChoices,
  type Cell,
  type SuiteCard,
} from './suite';
import './suite.css';

export const SUITE_QUESTION = 'Qu’est-ce qui vient ensuite ?';

/** Une case : l'image (ou plusieurs, pour les suites qui grandissent). */
function SuiteCell({ cell }: { cell: Cell }) {
  return (
    <li className={`suite-cell${cell.count > 1 ? ' suite-cell--many' : ''}`}>
      <span role="img" aria-label={cellName(cell)}>
        {Array.from({ length: cell.count }, (_, i) => (
          <span key={i} className="suite-emoji" aria-hidden="true">
            {cell.item.emoji}
          </span>
        ))}
      </span>
    </li>
  );
}

const option = (cell: Cell): ChoiceOption => ({
  key: cellKey(cell),
  label: cellName(cell),
  emoji: cellEmoji(cell),
});

/**
 * « Répondre en montrant » (#123) : des images de la même famille (ou la même image en plus
 * ou moins grand nombre). Toucher la bonne réponse la met en valeur, le parent valide.
 */
function SuiteChoices({ card }: { card: SuiteCard }) {
  const count = useChoiceCount();
  const [cells] = useState(() => suiteChoices(card, count));
  if (!count || cells.length < 2) return null;
  return (
    <div className={`suite-choices${card.motif.startsWith('grow') ? ' suite-choices--many' : ''}`}>
      <ChoiceBoard options={cells.map(option)} answer={cellKey(card.answer)} />
    </div>
  );
}

/**
 * Une manche : la question, la suite avec sa case vide et la zone du parent. Suite générée à
 * la première image de la manche (le composant est remonté à chaque manche), d'après le
 * niveau de l'image tirée. `random` : tirage reproductible (Défi du jour) ; `choices` : sans
 * choix à montrer dans le Défi du jour, comme les autres jeux.
 * Aussi jouée dans le Grand Jeu et le Défi du jour.
 */
export function SuiteRound({
  item,
  random,
  choices = true,
}: {
  item: DeckItem;
  random?: () => number;
  choices?: boolean;
}) {
  const [card] = useState(() => makeSuite(item, random));
  return (
    <div className="deck-round round-in">
      <section className="deck-card deck-card--question suite-card" aria-label="Question">
        <span className="word-card__label">Le parent lit à voix haute</span>
        <p className="deck-card__question">{SUITE_QUESTION}</p>
        <ReadAloud text={SUITE_QUESTION} />
      </section>

      <section aria-label="Suite">
        <ol className="suite-row">
          {card.cells.map((cell, i) => (
            <SuiteCell key={i} cell={cell} />
          ))}
          <li className="suite-cell suite-cell--blank">
            <span role="img" aria-label="Case vide">
              ?
            </span>
          </li>
        </ol>
      </section>

      {choices && <SuiteChoices card={card} />}

      <ParentBlock hidden={<>{card.explain}</>} hints={[card.hint]}>
        L’enfant dit ou montre ce qui vient dans la case vide. Une autre idée bien expliquée compte
        aussi : c’est toi qui valides.
      </ParentBlock>
    </div>
  );
}

function SuiteSession({ game, onReplay }: { game: CatalogueGame; onReplay: () => void }) {
  const setting = useRoundSetting();
  const turns = useTurns(game.id);
  // Images tirées pour la partie, retrouvées après un rafraîchissement.
  // Chacun son tour (#38) : chaque image au niveau de l'enfant de la manche.
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
      {/* key : nouvelle manche = nouvelle suite, indices et réponse remis à zéro. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <SuiteRound key={round} item={item} />
      </TurnPlayer.Provider>
      <div className="spacer" />
      <AnswerBar onSkip={() => answer(false)} onFound={() => answer(true)} skipLabel="Pas encore" />
    </main>
  );
}

/** La suite logique (#129), jeu du catalogue avec son propre écran. */
export function SuiteGame({ game }: { game: CatalogueGame }) {
  return <Replayable>{(replay) => <SuiteSession game={game} onReplay={replay} />}</Replayable>;
}
