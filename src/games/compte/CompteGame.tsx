import { Fragment, useState } from 'react';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import { getSettings } from '../../data/settings';
import type { CatalogueGame } from '../catalogue/catalogue';
import { ChoiceBoard } from '../choices/ChoiceBoard';
import { deckOption, type ChoiceOption } from '../choices/choices';
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
  CELL,
  EMOJI_SIZE,
  makeCard,
  nearNumbers,
  plural,
  type CountCard,
  type CountGroup,
} from './compte';
import './compte.css';

/** Les objets d'un groupe, dessinés sans chevauchement ; les objets enlevés sont barrés. */
function CountField({ group }: { group: CountGroup }) {
  const { field, object } = group;
  const half = EMOJI_SIZE / 2;
  return (
    <svg
      className={`compte-field compte-field--${field.cols}`}
      viewBox={`0 0 ${field.cols * CELL} ${field.rows * CELL}`}
      role="img"
      aria-label={`Des ${plural(object)} à compter`}
    >
      {field.spots.map((spot, i) => {
        const crossed = field.crossed.includes(i);
        return (
          <g key={i} className={crossed ? 'is-crossed' : undefined}>
            <text
              x={spot.x}
              y={spot.y}
              fontSize={EMOJI_SIZE}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {object.emoji}
            </text>
            {crossed && (
              <path
                className="compte-cross"
                d={`M${spot.x - half} ${spot.y - half}L${spot.x + half} ${spot.y + half}M${spot.x + half} ${spot.y - half}L${spot.x - half} ${spot.y + half}`}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

const numberOption = (n: number): ChoiceOption => ({
  key: String(n),
  label: String(n),
  glyph: String(n),
});

/**
 * « Répondre en montrant » (#123) : des nombres proches de la réponse, rangés dans l'ordre ;
 * pour comparer, les deux groupes. Toucher la bonne réponse la met en valeur, le parent valide.
 */
function CountChoices({ card }: { card: CountCard }) {
  const count = useChoiceCount();
  const [near] = useState(() => (card.kind === 'compare' ? [] : nearNumbers(Number(card.answer))));
  if (!count) return null;
  if (card.kind === 'compare') {
    const options = card.groups.map((g) => deckOption(g.object));
    const right = card.groups.find((g) => g.object.answer === card.answer)!;
    return <ChoiceBoard options={options} answer={deckOption(right.object).key} />;
  }
  const numbers = [Number(card.answer), ...near.slice(0, Math.min(count, 4) - 1)].sort(
    (a, b) => a - b,
  );
  return <ChoiceBoard options={numbers.map(numberOption)} answer={card.answer} />;
}

/**
 * Une manche : la question, les objets à compter et la zone du parent. Carte générée à la
 * première image de la manche (le composant est remonté à chaque manche), d'après le niveau
 * de l'objet tiré. `random` : tirage reproductible (Défi du jour) ; `choices` : sans choix
 * à montrer dans le Défi du jour, comme les autres jeux.
 * Aussi jouée dans le Grand Jeu et le Défi du jour.
 */
export function CompteRound({
  item,
  random,
  choices = true,
}: {
  item: DeckItem;
  random?: () => number;
  choices?: boolean;
}) {
  const [card] = useState(() => makeCard(item, random));
  return (
    <div className="deck-round round-in">
      <section className="deck-card deck-card--question compte-card" aria-label="Question">
        <span className="word-card__label">Le parent lit à voix haute</span>
        <p className="deck-card__question">{card.question}</p>
        <ReadAloud text={card.question} />
      </section>

      <section className={`compte-groups compte-groups--${card.kind}`} aria-label="Objets">
        {card.groups.map((g, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <span className="compte-sign" aria-hidden="true">
                {card.kind === 'add' ? '+' : 'ou'}
              </span>
            )}
            <CountField group={g} />
          </Fragment>
        ))}
      </section>

      {choices && <CountChoices card={card} />}

      <ParentBlock hidden={<>{card.explain}</>} hints={[card.hint]}>
        {card.kind === 'compare'
          ? 'L’enfant montre le groupe qui en a le plus, ou le nomme.'
          : 'L’enfant compte et dit le nombre. Compter ensemble, c’est déjà gagné.'}
      </ParentBlock>
    </div>
  );
}

function CompteSession({ game, onReplay }: { game: CatalogueGame; onReplay: () => void }) {
  const setting = useRoundSetting();
  const turns = useTurns(game.id);
  // Objets tirés pour la partie, retrouvés après un rafraîchissement.
  // Chacun son tour (#38) : chaque objet au niveau de l'enfant de la manche.
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
      {/* key : nouvelle manche = nouvelle carte générée, indices et réponse remis à zéro. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <CompteRound key={round} item={item} />
      </TurnPlayer.Provider>
      <div className="spacer" />
      <AnswerBar onSkip={() => answer(false)} onFound={() => answer(true)} skipLabel="Pas encore" />
    </main>
  );
}

/** Compte avec moi (#65), jeu du catalogue avec son propre écran. */
export function CompteGame({ game }: { game: CatalogueGame }) {
  return <Replayable>{(replay) => <CompteSession game={game} onReplay={replay} />}</Replayable>;
}
