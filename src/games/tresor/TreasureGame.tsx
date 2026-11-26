import { useEffect, useMemo, useState } from 'react';
import { playSound } from '../../audio/sounds';
import { AnswerBar } from '../../components/AnswerBar';
import { Button } from '../../components/Button';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { IconMusic, IconTimer } from '../../components/icons';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import { getSettings } from '../../data/settings';
import { vibrate } from '../../pwa/haptics';
import { extractLength } from '../chanson/melody';
import { audioAvailable, MelodyPlayer } from '../chanson/player';
import type { CatalogueGame } from '../catalogue/catalogue';
import { cardKey } from '../deck/cardKey';
import type { DeckItem } from '../deck/types';
import { useCountdown } from '../dessin/useCountdown';
import { clock } from '../format';
import { writtenHints } from '../hints';
import { cardLevel, drawForLevel } from '../levels';
import { playsStill } from '../modes';
import { Replayable } from '../Replayable';
import { useSaved, useSavedDraw } from '../session';
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns } from '../useTurns';
import {
  isTreasureWay,
  TREASURE_WAYS,
  treasureSeconds,
  treasureWay,
  waitingEvents,
  WAY_LINE,
  WAY_PARENT,
  type TreasureWay,
} from './treasure';
import './tresor.css';

/** Musique d'attente pendant que le minuteur tourne ; coupée à zéro et en quittant. */
function useWaitingMusic(on: boolean, seconds: number) {
  const player = useMemo(() => {
    const events = waitingEvents(seconds);
    return new MelodyPlayer(events, extractLength(events));
  }, [seconds]);
  useEffect(() => {
    if (!on || !audioAvailable()) return;
    void player.play().catch(() => undefined);
    return () => void player.stop();
  }, [on, player]);
}

/** Minuteur doux : il compte, puis dit que le temps est fini, sans rien faire perdre. */
function TreasureTimer({ seconds, music }: { seconds: number; music: boolean }) {
  const left = useCountdown(seconds, seconds);
  const timeUp = left <= 0;
  useWaitingMusic(music && !timeUp, seconds);
  useEffect(() => {
    if (!timeUp) return;
    vibrate('timeUp');
    void playSound('timer');
  }, [timeUp]);
  return (
    <>
      <span
        className="timer treasure-timer"
        role="timer"
        aria-label={timeUp ? 'Temps écoulé' : `${left} secondes restantes`}
      >
        <IconTimer size={20} />
        {clock(left)}
      </span>
      <span className="muted" role="status">
        {timeUp ? 'Le temps est fini, ce n’est pas grave : le parent décide.' : ''}
      </span>
    </>
  );
}

/**
 * Une manche : la consigne lue par le parent, le minuteur facultatif et la zone du parent.
 * Aussi jouée dans le Grand Jeu et le Défi du jour. `seconds` à 0 : pas de minuteur.
 */
export function TreasureRound({
  item,
  way,
  seconds,
}: {
  item: DeckItem;
  way: TreasureWay;
  seconds: number;
}) {
  const [started, setStarted] = useState(false);
  const [music, setMusic] = useState(false);
  const say = `${item.text ?? item.answer}. ${WAY_LINE[way]}`;
  return (
    <div className="deck-round round-in">
      <section className="deck-card deck-card--question treasure-card" aria-label="Consigne">
        <span className="word-card__label">Le parent lit à voix haute</span>
        <p className="deck-card__question">
          {item.emoji && (
            <span className="treasure-card__emoji" aria-hidden="true">
              {item.emoji}{' '}
            </span>
          )}
          {item.text ?? item.answer}
        </p>
        <p className="treasure-card__way">{WAY_LINE[way]}</p>
        <ReadAloud text={say} />
      </section>

      {seconds > 0 && (
        <div className="treasure-timer-row">
          {started ? (
            <TreasureTimer seconds={seconds} music={music} />
          ) : (
            <Button
              variant="secondary"
              icon={<IconTimer size={20} />}
              onClick={() => setStarted(true)}
            >
              Lancer le minuteur ({clock(seconds)})
            </Button>
          )}
          <button
            type="button"
            className="filter-chip treasure-music"
            aria-pressed={music}
            onClick={() => setMusic(!music)}
          >
            <IconMusic size={18} />
            Musique d’attente
          </button>
        </div>
      )}

      <ParentBlock hints={writtenHints(item)}>{WAY_PARENT[way]}</ParentBlock>
    </div>
  );
}

const restoreWay = (saved: unknown) => (isTreasureWay(saved) ? saved : undefined);

function TreasureSession({ game, onReplay }: { game: CatalogueGame; onReplay: () => void }) {
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
  const [chosen, setChosen] = useSaved<TreasureWay>(game.id, 'way', () => 'run', restoreWay);
  // Façon de jouer (#42) figée pour la partie : au Coucher et en Voiture, sans courir.
  const [mode] = useState(() => getSettings().gameMode);
  const way = treasureWay(chosen, mode);
  const forced = playsStill(mode);

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
      {forced ? (
        <p className="muted">Version sans courir, pour jouer au calme.</p>
      ) : (
        <div className="segmented segmented--2" role="radiogroup" aria-label="Façon de chercher">
          {TREASURE_WAYS.map((w) => (
            <label key={w.value}>
              <input
                type="radio"
                name="treasure-way"
                value={w.value}
                checked={chosen === w.value}
                onChange={() => setChosen(w.value)}
              />
              {w.label}
            </label>
          ))}
        </div>
      )}
      {/* key : nouvelle manche (ou autre façon de chercher) = minuteur et indices remis à zéro. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <TreasureRound
          key={`${round}:${way}`}
          item={item}
          way={way}
          seconds={treasureSeconds(way, mode)}
        />
      </TurnPlayer.Provider>
      <div className="spacer" />
      <AnswerBar onSkip={() => answer(false)} onFound={() => answer(true)} skipLabel="Pas encore" />
    </main>
  );
}

/** Chasse au trésor maison (#60), jeu du catalogue avec son propre écran. */
export function TreasureGame({ game }: { game: CatalogueGame }) {
  return <Replayable>{(replay) => <TreasureSession game={game} onReplay={replay} />}</Replayable>;
}
