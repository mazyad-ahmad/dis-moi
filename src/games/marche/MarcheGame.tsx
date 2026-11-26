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
import { CoinRow } from './CoinRow';
import { coinsSvg } from './coins';
import {
  coinsName,
  coinsText,
  makeMarche,
  marcheChoices,
  priceText,
  type MarcheCard,
} from './marche';
import './marche.css';

/** Un choix : une poignée de pièces, dessinée en image. */
const option = (coins: number[]): ChoiceOption => ({
  key: coinsText(coins),
  label: coinsName(coins),
  image: new Blob([coinsSvg(coins)], { type: 'image/svg+xml' }),
});

/**
 * « Répondre en montrant » (#123) : des poignées de pièces, une seule fait le bon compte.
 * Toucher la bonne la met en valeur, le parent valide.
 */
function MarcheChoices({ card }: { card: MarcheCard }) {
  const count = useChoiceCount();
  const [options] = useState(() => marcheChoices(card, count).map(option));
  if (!count || options.length < 2) return null;
  return (
    <div className="marche-choices">
      <ChoiceBoard options={options} answer={coinsText(card.answer)} />
    </div>
  );
}

/**
 * Une manche : la question, l'article avec son étiquette, le porte-monnaie et la zone du
 * parent. `choices` : sans choix à montrer dans le Défi du jour, comme les autres jeux.
 * Aussi jouée dans le Grand Jeu et le Défi du jour.
 */
export function MarcheRound({ item, choices = true }: { item: DeckItem; choices?: boolean }) {
  const [card] = useState(() => makeMarche(item));
  return (
    <div className="deck-round round-in">
      <section className="deck-card deck-card--question marche-card" aria-label="Question">
        <span className="word-card__label">Le parent lit à voix haute</span>
        <p className="deck-card__question">{card.question}</p>
        <ReadAloud text={card.question} />
      </section>

      <section className="marche-stall" aria-label="Article">
        <span className="marche-item" role="img" aria-label={card.item.answer}>
          {card.item.emoji}
        </span>
        <span className="marche-price">{priceText(card.price)}</span>
      </section>

      <section className="marche-purse" aria-label="Porte-monnaie">
        <span className="word-card__label">Les pièces du porte-monnaie</span>
        <CoinRow coins={card.coins} label={`Pièces de ${coinsName(card.coins)}`} />
      </section>

      {choices && <MarcheChoices card={card} />}

      <ParentBlock
        hidden={
          <>
            {card.explain}
            <CoinRow coins={card.answer} label={coinsName(card.answer)} />
          </>
        }
        hints={card.hints}
      >
        L’enfant dit ou montre les pièces à donner. Toute façon de faire le bon compte est juste :
        c’est toi qui valides.
      </ParentBlock>
    </div>
  );
}

function MarcheSession({ game, onReplay }: { game: CatalogueGame; onReplay: () => void }) {
  const setting = useRoundSetting();
  const turns = useTurns(game.id);
  // Articles tirés pour la partie, retrouvés après un rafraîchissement.
  // Chacun son tour (#38) : chaque article au niveau de l'enfant de la manche.
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
      {/* key : nouvelle manche = nouvel article, indices et réponse remis à zéro. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <MarcheRound key={round} item={item} />
      </TurnPlayer.Provider>
      <div className="spacer" />
      <AnswerBar onSkip={() => answer(false)} onFound={() => answer(true)} skipLabel="Pas encore" />
    </main>
  );
}

/** Le petit marché (#136), jeu du catalogue avec son propre écran. */
export function MarcheGame({ game }: { game: CatalogueGame }) {
  return <Replayable>{(replay) => <MarcheSession game={game} onReplay={replay} />}</Replayable>;
}
