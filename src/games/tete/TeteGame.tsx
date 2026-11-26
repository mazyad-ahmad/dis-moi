import { useCallback, useState, type CSSProperties } from 'react';
import { AnswerBar } from '../../components/AnswerBar';
import { Button } from '../../components/Button';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { getSettings } from '../../data/settings';
import type { CatalogueGame } from '../catalogue/catalogue';
import { cardKey } from '../deck/cardKey';
import type { DeckItem } from '../deck/types';
import { cardLevel, drawForLevel } from '../levels';
import { Replayable } from '../Replayable';
import { useSavedDraw } from '../session';
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns } from '../useTurns';
import { askTilt, tiltAsks, tiltAvailable, type TiltGesture } from './tilt';
import { useLandscape, useTilt, type TiltStatus } from './useTilt';
import './tete.css';

/** Comment on répond : en penchant la tête (capteur) ou avec les boutons. */
export type TeteControls = 'tilt' | 'buttons';

export const TILT_LINE = 'Tête vers le bas : trouvé. Tête vers le haut : passer.';

const STATUS_LINE: Record<TiltStatus, string> = {
  waiting: 'Pose le téléphone sur ton front, l’écran vers les autres.',
  live: TILT_LINE,
  absent: 'L’inclinaison ne répond pas sur ce téléphone : utilisez les boutons.',
};

/**
 * Le mot, en grand, pour les autres. Quand l'écran reste en portrait, il est tourné d'un quart
 * de tour (côté connu par le capteur, sinon le plus courant), et « Retourner le mot » le met à
 * l'endroit pour l'autre côté.
 */
export function TeteRound({ item, side }: { item: DeckItem; side?: 'left' | 'right' }) {
  const [flipped, setFlipped] = useState(false);
  const turn = (side === 'right' ? -90 : 90) + (flipped ? 180 : 0);
  return (
    <div className="deck-round round-in">
      <section className="deck-card tete-card" aria-label="Mot à faire deviner">
        <div className="tete-word" style={{ '--tete-turn': `${turn}deg` } as CSSProperties}>
          {item.emoji && (
            <span className="tete-word__emoji" aria-hidden="true">
              {item.emoji}
            </span>
          )}
          <p className="tete-word__answer">{item.answer}</p>
          {item.hint && <p className="tete-word__hint">Idée : {item.hint}</p>}
        </div>
      </section>
      <Button variant="ghost" className="tete-flip" onClick={() => setFlipped((f) => !f)}>
        Retourner le mot
      </Button>
    </div>
  );
}

/** Avant la première manche : la règle, puis le choix des boutons ou de l'inclinaison. */
function TeteIntro({ onChoose }: { onChoose: (controls: TeteControls) => void }) {
  const [available] = useState(tiltAvailable);
  const [refused, setRefused] = useState(false);
  const [asking, setAsking] = useState(false);
  const { sounds } = getSettings();
  return (
    <section className="tete-intro" aria-label="Comment on joue">
      <p>
        L’enfant tient le téléphone <strong>sur son front</strong>, l’écran tourné vers les autres :
        il ne voit pas le mot. Les autres le miment ou le décrivent, sans le dire.
      </p>
      <p>
        Un son lui dit ce qui s’est passé : un petit air qui monte quand c’est trouvé, « toc-toc »
        pour passer.
      </p>
      {!sounds && (
        <p className="tete-intro__note" role="note">
          Les sons sont coupés dans l’espace Parent : l’enfant ne les entendra pas.
        </p>
      )}
      {available && !refused ? (
        <>
          <h2 className="tete-intro__title">Pencher la tête (facultatif)</h2>
          <p>
            Le téléphone peut sentir quand l’enfant penche la tête : vers le bas, c’est trouvé ;
            vers le haut, il passe. L’inclinaison est lue sur le téléphone seulement : rien n’est
            enregistré ni envoyé.
            {tiltAsks() &&
              ' Le téléphone va demander l’autorisation d’accéder à ses mouvements : elle ne sert qu’à ça.'}
          </p>
          <div className="tete-intro__actions">
            <Button
              disabled={asking}
              onClick={() => {
                setAsking(true);
                void askTilt().then((ok) => {
                  setAsking(false);
                  if (ok) onChoose('tilt');
                  else setRefused(true);
                });
              }}
            >
              Jouer en penchant la tête
            </Button>
            <Button variant="secondary" onClick={() => onChoose('buttons')}>
              Jouer avec les boutons
            </Button>
          </div>
        </>
      ) : (
        <>
          <p role="status">
            {refused
              ? 'Sans l’inclinaison, on joue avec les boutons : c’est pareil.'
              : 'Ce téléphone ne sent pas l’inclinaison : on joue avec les boutons.'}
          </p>
          <div className="tete-intro__actions">
            <Button onClick={() => onChoose('buttons')}>C’est parti</Button>
          </div>
        </>
      )}
    </section>
  );
}

/** Les manches : le mot en grand, les boutons toujours là, l'inclinaison si elle est choisie. */
function TetePlay({
  item,
  round,
  tilt,
  answer,
}: {
  item: DeckItem;
  round: number;
  tilt: boolean;
  answer: (found: boolean, gesture?: boolean) => void;
}) {
  useLandscape(true);
  const onGesture = useCallback(
    (gesture: TiltGesture) => answer(gesture === 'down', true),
    [answer],
  );
  const sensor = useTilt(tilt, onGesture);
  return (
    <>
      {/* key : nouvelle manche = nouveau mot, remis à l'endroit. */}
      <TeteRound key={round} item={item} side={sensor.side} />
      <p className="tete-status muted" role="status">
        {tilt ? STATUS_LINE[sensor.status] : 'Les autres appuient sur Trouvé ou Passer.'}
      </p>
      <div className="spacer" />
      <AnswerBar onSkip={() => answer(false, true)} onFound={() => answer(true, true)} />
    </>
  );
}

function TeteSession({ game, onReplay }: { game: CatalogueGame; onReplay: () => void }) {
  const setting = useRoundSetting();
  const turns = useTurns(game.id);
  // Tirage figé pour la partie, retrouvé après un rafraîchissement.
  // Chacun son tour (#38) : chaque mot au niveau de l'enfant qui a le téléphone sur le front.
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
  const [controls, setControls] = useState<TeteControls>();

  if (finished)
    return <GameResult stars={stars} rounds={rounds} teams={teams} onReplay={onReplay} />;

  return (
    <main className={`screen${controls ? ' tete-screen' : ''}`}>
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
        {controls ? (
          <TetePlay
            item={items[round - 1]}
            round={round}
            tilt={controls === 'tilt'}
            answer={answer}
          />
        ) : (
          <TeteIntro onChoose={setControls} />
        )}
      </TurnPlayer.Provider>
    </main>
  );
}

/** Devine-tête (#67), jeu du catalogue avec son propre écran. */
export function TeteGame({ game }: { game: CatalogueGame }) {
  return <Replayable>{(replay) => <TeteSession game={game} onReplay={replay} />}</Replayable>;
}
