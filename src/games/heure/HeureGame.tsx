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
  digital,
  handAngles,
  heureChoices,
  makeHeure,
  timeName,
  type HeureCard,
  type Time,
} from './heure';
import './heure.css';

export const HEURE_QUESTION = 'Quelle heure est-il ?';

/** Point du cadran à `angle` degrés depuis le 12 et à `r` du centre. */
function at(angle: number, r: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.round(Math.sin(rad) * r * 100) / 100,
    y: Math.round(-Math.cos(rad) * r * 100) / 100,
  };
}

/**
 * Horloge à aiguilles dessinée par l'appli : cadran, chiffres de 1 à 12, petite aiguille
 * courte et épaisse, grande aiguille longue et fine d'une autre couleur. Couleurs des jetons
 * du thème : lisible de jour comme en mode sombre. Le nom ne dit pas l'heure.
 */
export function Clock({ time }: { time: Time }) {
  const angles = handAngles(time);
  const hourEnd = at(angles.hour, 46);
  const minuteEnd = at(angles.minute, 74);
  return (
    <svg
      className="heure-clock"
      viewBox="-100 -100 200 200"
      role="img"
      aria-label="Horloge à aiguilles"
    >
      <circle className="heure-clock__face" r="94" />
      {Array.from({ length: 60 }, (_, i) => {
        const big = i % 5 === 0;
        const a = at(i * 6, 90);
        const b = at(i * 6, big ? 80 : 85);
        return (
          <line
            key={i}
            className={big ? 'heure-clock__tick heure-clock__tick--hour' : 'heure-clock__tick'}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
          />
        );
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const p = at((i + 1) * 30, 66);
        return (
          <text
            key={i}
            className="heure-clock__number"
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {i + 1}
          </text>
        );
      })}
      <line
        className="heure-clock__hand heure-clock__hand--hour"
        x1="0"
        y1="0"
        x2={hourEnd.x}
        y2={hourEnd.y}
      />
      <line
        className="heure-clock__hand heure-clock__hand--minute"
        x1="0"
        y1="0"
        x2={minuteEnd.x}
        y2={minuteEnd.y}
      />
      <circle className="heure-clock__pin" r="6" />
    </svg>
  );
}

const option = (time: Time): ChoiceOption => ({
  key: digital(time),
  label: timeName(time),
  glyph: digital(time),
});

/**
 * « Répondre en montrant » (#123) : l'heure en chiffres, comme sur une montre numérique, parmi
 * des heures proches. Toucher la bonne réponse la met en valeur, le parent valide.
 */
function HeureChoices({ card }: { card: HeureCard }) {
  const count = useChoiceCount();
  const [times] = useState(() => heureChoices(card.time, count));
  if (!count || times.length < 2) return null;
  return (
    <div className="heure-choices">
      <ChoiceBoard options={times.map(option)} answer={digital(card.time)} />
    </div>
  );
}

/**
 * Une manche : la question, l'horloge et la zone du parent. `choices` : sans choix à montrer
 * dans le Défi du jour, comme les autres jeux. Aussi jouée dans le Grand Jeu et le Défi du jour.
 */
export function HeureRound({ item, choices = true }: { item: DeckItem; choices?: boolean }) {
  const [card] = useState(() => makeHeure(item));
  return (
    <div className="deck-round round-in">
      <section className="deck-card deck-card--question heure-card" aria-label="Question">
        <span className="word-card__label">Le parent lit à voix haute</span>
        <p className="deck-card__question">{HEURE_QUESTION}</p>
        <ReadAloud text={HEURE_QUESTION} />
      </section>

      <section className="heure-dial" aria-label="Horloge">
        <Clock time={card.time} />
      </section>

      {choices && <HeureChoices card={card} />}

      <ParentBlock hidden={<>{card.explain}</>} hints={card.hints}>
        L’enfant lit l’heure à voix haute ou la montre. Lire l’heure ensemble, c’est déjà gagné.
      </ParentBlock>
    </div>
  );
}

function HeureSession({ game, onReplay }: { game: CatalogueGame; onReplay: () => void }) {
  const setting = useRoundSetting();
  const turns = useTurns(game.id);
  // Heures tirées pour la partie, retrouvées après un rafraîchissement.
  // Chacun son tour (#38) : chaque heure au niveau de l'enfant de la manche.
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
      {/* key : nouvelle manche = nouvelle horloge, indices et réponse remis à zéro. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <HeureRound key={round} item={item} />
      </TurnPlayer.Provider>
      <div className="spacer" />
      <AnswerBar onSkip={() => answer(false)} onFound={() => answer(true)} skipLabel="Pas encore" />
    </main>
  );
}

/** Quelle heure est-il ? (#136), jeu du catalogue avec son propre écran. */
export function HeureGame({ game }: { game: CatalogueGame }) {
  return <Replayable>{(replay) => <HeureSession game={game} onReplay={replay} />}</Replayable>;
}
