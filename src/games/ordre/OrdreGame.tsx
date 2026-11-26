import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
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
import { writtenHints } from '../hints';
import { cardLevel, drawForLevel } from '../levels';
import { Replayable } from '../Replayable';
import { useSavedDraw } from '../session';
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns } from '../useTurns';
import { isInOrder, mixedOrder, moveTo, ORDRE_QUESTION, stepsOf } from './ordre';
import './ordre.css';

const HELP = 'Touche une image, puis la place où la mettre.';
const DONE = 'Tout est dans l’ordre ! C’est le parent qui valide.';

/**
 * Une manche : la question, les images mélangées et la zone du parent. Les images se
 * déplacent au doigt (toucher une image, puis la place où la mettre, ou les flèches) et au
 * clavier (flèches sur l'image). Rien n'est jugé : le parent valide, un autre ordre qui se
 * tient compte aussi. Aussi jouée dans le Grand Jeu et le Défi du jour (`random` : même
 * mélange toute la journée).
 */
export function OrdreRound({ item, random }: { item: DeckItem; random?: () => number }) {
  const steps = stepsOf(item);
  // Ordre de départ tiré une fois pour la manche (le composant est remonté à chaque manche).
  const [order, setOrder] = useState(() => mixedOrder(steps.length, random));
  // Place de l'image touchée, en attente de sa nouvelle place.
  const [picked, setPicked] = useState<number>();
  const [said, setSaid] = useState(HELP);
  // Image à remettre sous le focus après un déplacement (le compteur relance l'effet).
  const [focus, setFocus] = useState<{ step: number; n: number }>();
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (focus) tiles.current[focus.step]?.focus();
  }, [focus]);

  const question = item.text ?? ORDRE_QUESTION;
  const last = order.length - 1;

  const move = (from: number, to: number) => {
    setPicked(undefined);
    if (to < 0 || to > last || from === to) return;
    const next = moveTo(order, from, to);
    const step = order[from];
    setOrder(next);
    setFocus((f) => ({ step, n: (f?.n ?? 0) + 1 }));
    setSaid(isInOrder(next) ? DONE : `${steps[step].text} : place ${to + 1}.`);
  };

  const tap = (place: number) => {
    if (picked === undefined) {
      setPicked(place);
      setSaid(`Touche la place où mettre « ${steps[order[place]].text} ».`);
    } else if (picked === place) {
      setPicked(undefined);
      setSaid(HELP);
    } else move(picked, place);
  };

  const onKey = (place: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const to = {
      ArrowUp: place - 1,
      ArrowLeft: place - 1,
      ArrowDown: place + 1,
      ArrowRight: place + 1,
      Home: 0,
      End: last,
    }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      move(place, to);
    } else if (e.key === 'Escape' && picked !== undefined) {
      setPicked(undefined);
      setSaid(HELP);
    }
  };

  const showRight = () => {
    setOrder(order.map((_, i) => i));
    setPicked(undefined);
    setSaid('Voilà le bon ordre !');
  };

  return (
    <div className="deck-round round-in">
      <section className="deck-card deck-card--question ordre-card" aria-label="Question">
        <span className="word-card__label">Le parent lit à voix haute</span>
        <p className="deck-card__question">{question}</p>
        <ReadAloud text={question} />
      </section>

      <section className="ordre" aria-label="Images à remettre dans l’ordre">
        <ol className="ordre-list">
          {order.map((step, place) => {
            const { text, emoji } = steps[step];
            return (
              <li key={step} className="ordre-row">
                <span className="ordre-row__place" aria-hidden="true">
                  {place + 1}
                </span>
                <button
                  ref={(el) => {
                    tiles.current[step] = el;
                  }}
                  type="button"
                  className={`ordre-tile${emoji ? '' : ' ordre-tile--word'}${picked === place ? ' is-shown' : ''}`}
                  aria-label={`${text}, place ${place + 1} sur ${order.length}`}
                  aria-pressed={picked === place}
                  aria-keyshortcuts="ArrowUp ArrowDown"
                  onClick={() => tap(place)}
                  onKeyDown={onKey(place)}
                >
                  {emoji && (
                    <span className="ordre-tile__emoji" aria-hidden="true">
                      {emoji}
                    </span>
                  )}
                  <span className="ordre-tile__text">{text}</span>
                </button>
                <span className="ordre-row__moves">
                  <button
                    type="button"
                    className="ordre-move"
                    aria-label={`Avant : ${text}`}
                    disabled={place === 0}
                    onClick={() => move(place, place - 1)}
                  >
                    <span aria-hidden="true">▲</span>
                  </button>
                  <button
                    type="button"
                    className="ordre-move"
                    aria-label={`Après : ${text}`}
                    disabled={place === last}
                    onClick={() => move(place, place + 1)}
                  >
                    <span aria-hidden="true">▼</span>
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="ordre-status muted" role="status">
          {said}
        </p>
      </section>

      <ParentBlock
        hidden={
          <>
            <strong>{item.answer}</strong>
            <ol className="ordre-answer">
              {steps.map((s) => (
                <li key={s.text}>
                  {s.emoji && `${s.emoji} `}
                  {s.text}
                </li>
              ))}
            </ol>
            <Button variant="secondary" onClick={showRight}>
              Montrer le bon ordre
            </Button>
          </>
        }
        hints={writtenHints(item)}
      >
        L’enfant dit l’ordre ou déplace les images ; tu peux aussi les déplacer sous sa dictée. Un
        autre ordre qui se tient compte aussi : c’est toi qui valides.
      </ParentBlock>
    </div>
  );
}

function OrdreSession({ game, onReplay }: { game: CatalogueGame; onReplay: () => void }) {
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
      {/* key : nouvelle manche = nouveau mélange, indices et réponse remis à zéro. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <OrdreRound key={round} item={item} />
      </TurnPlayer.Provider>
      <div className="spacer" />
      <AnswerBar onSkip={() => answer(false)} onFound={() => answer(true)} skipLabel="Pas encore" />
    </main>
  );
}

/** Remets dans l'ordre (#131), jeu du catalogue avec son propre écran. */
export function OrdreGame({ game }: { game: CatalogueGame }) {
  return <Replayable>{(replay) => <OrdreSession game={game} onReplay={replay} />}</Replayable>;
}
