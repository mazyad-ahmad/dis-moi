import { useState } from 'react';
import { AnswerBar } from '../../components/AnswerBar';
import { Button } from '../../components/Button';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { IconEye } from '../../components/icons';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import { getSettings } from '../../data/settings';
import { findCatalogueGame, type CatalogueGame } from '../catalogue/catalogue';
import { ChoiceBoard } from '../choices/ChoiceBoard';
import { arrange, deckOption } from '../choices/choices';
import { useChoiceCount } from '../choices/useChoices';
import { cardKey } from '../deck/cardKey';
import type { DeckItem } from '../deck/types';
import { writtenHints } from '../hints';
import { cardLevel, drawForLevel } from '../levels';
import { Replayable } from '../Replayable';
import { useSaved, useSavedDraw } from '../session';
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns } from '../useTurns';
import {
  buildScene,
  DISPARU_ID,
  DISPARU_VARIANTS,
  drawCompanions,
  isDisparuVariant,
  placeName,
  VARIANT_QUESTION,
  type DisparuVariant,
  type Spot,
} from './disparu';
import './disparu.css';

/** Étapes d'une manche, chacune lancée par le parent : rien n'est minuté. */
type Step = 'look' | 'hidden' | 'back';

const SAY: Record<Exclude<Step, 'back'>, string> = {
  look: 'Regarde bien tous les objets !',
  hidden: 'Ferme les yeux !',
};

function Scene({ spots, columns, covered }: { spots: Spot[]; columns: number; covered: boolean }) {
  return (
    <section className="disparu-scene" aria-label="Objets">
      <div className={`disparu-grid disparu-grid--${columns}`}>
        {spots.map((spot, i) =>
          covered ? (
            <span key={i} className="disparu-cell disparu-cell--covered" aria-hidden="true">
              ?
            </span>
          ) : spot ? (
            <span key={i} className="disparu-cell" role="img" aria-label={spot.answer}>
              {spot.emoji}
            </span>
          ) : (
            <span key={i} className="disparu-cell disparu-cell--empty" aria-hidden="true" />
          ),
        )}
      </div>
    </section>
  );
}

/**
 * Une manche : observer, cacher, remontrer. Le parent passe d'une étape à l'autre quand il
 * veut (pas de temps imposé). Aussi jouée dans le Grand Jeu et le Défi du jour.
 * `pool` : les cartes où prendre les autres objets (par défaut, celles du jeu du catalogue).
 */
export function DisparuRound({
  item,
  variant = 'disparu',
  pool,
}: {
  item: DeckItem;
  variant?: DisparuVariant;
  pool?: readonly DeckItem[];
}) {
  // Scène tirée une fois pour la manche (le composant est remonté à chaque manche).
  const [scene] = useState(() =>
    buildScene(
      item,
      drawCompanions(item, pool ?? findCatalogueGame(DISPARU_ID)?.items ?? []),
      variant,
    ),
  );
  const [slot] = useState(() => Math.random());
  const [step, setStep] = useState<Step>('look');
  const count = useChoiceCount();
  const { rule, before, after, stay, spot } = scene;
  const say = step === 'back' ? VARIANT_QUESTION[variant] : SAY[step];
  // En montrant, quand un objet a disparu : l'enfant le retrouve parmi ceux restés là.
  // Quand un objet arrive, il le montre directement sur la scène.
  const answer = deckOption(item);
  const choices =
    step === 'back' && variant === 'disparu' && count > 0
      ? arrange(answer, stay.map(deckOption), count, slot)
      : [];
  const where = placeName(spot, rule.columns, variant === 'disparu' ? before.length : after.length);

  return (
    <div className="deck-round round-in">
      <section className="deck-card deck-card--question disparu-card" aria-label="Question">
        <span className="word-card__label">Le parent lit à voix haute</span>
        <p className="deck-card__question">{say}</p>
        <ReadAloud key={step} text={say} />
      </section>

      <Scene
        key={step}
        spots={step === 'back' ? after : before}
        columns={rule.columns}
        covered={step === 'hidden'}
      />
      <p className="disparu-status muted" role="status">
        {step === 'look' &&
          (rule.moves
            ? 'Attention : en revenant, les objets changeront de place.'
            : 'Les objets resteront à leur place.')}
        {step === 'hidden' && 'Les objets sont cachés.'}
        {step === 'back' && (variant === 'arrive' ? 'Montre-le du doigt !' : '')}
      </p>

      {step === 'look' && (
        <Button
          variant="secondary"
          block
          icon={<IconEye size={20} />}
          onClick={() => setStep('hidden')}
        >
          Cacher les objets
        </Button>
      )}
      {step === 'hidden' && (
        <Button
          variant="secondary"
          block
          icon={<IconEye size={20} />}
          onClick={() => setStep('back')}
        >
          Remontrer les objets
        </Button>
      )}
      {choices.length > 0 && <ChoiceBoard options={choices} answer={answer.key} />}

      <ParentBlock
        hidden={
          <>
            {item.emoji} {item.answer} ({where})
            {rule.moves && <p className="parent-block__talk">Les autres objets ont bougé.</p>}
          </>
        }
        hints={writtenHints(item)}
      >
        {step === 'look' &&
          'Laisse l’enfant regarder aussi longtemps qu’il veut, puis cache les objets.'}
        {step === 'hidden' &&
          (variant === 'arrive'
            ? 'Dis « Ferme les yeux ! » : un objet va arriver. Puis remontre les objets.'
            : 'Dis « Ferme les yeux ! » : un objet va partir. Puis remontre les objets.')}
        {step === 'back' &&
          'L’enfant le nomme ou le montre. Pas trouvé ? Un indice, ou on regarde la réponse ensemble.'}
      </ParentBlock>
    </div>
  );
}

const restoreVariant = (saved: unknown) => (isDisparuVariant(saved) ? saved : undefined);

function DisparuSession({ game, onReplay }: { game: CatalogueGame; onReplay: () => void }) {
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
  const [variant, setVariant] = useSaved<DisparuVariant>(
    game.id,
    'variant',
    () => 'disparu',
    restoreVariant,
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
      <div className="segmented segmented--2" role="radiogroup" aria-label="Façon de jouer">
        {DISPARU_VARIANTS.map((v) => (
          <label key={v.value}>
            <input
              type="radio"
              name="disparu-variant"
              value={v.value}
              checked={variant === v.value}
              onChange={() => setVariant(v.value)}
            />
            {v.label}
          </label>
        ))}
      </div>
      {/* key : nouvelle manche (ou autre variante) = nouvelle scène, on recommence à observer. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <DisparuRound key={`${round}:${variant}`} item={item} variant={variant} pool={game.items} />
      </TurnPlayer.Provider>
      <div className="spacer" />
      <AnswerBar onSkip={() => answer(false)} onFound={() => answer(true)} skipLabel="Pas encore" />
    </main>
  );
}

/** Qu'est-ce qui a disparu ? (#64), jeu du catalogue avec son propre écran. */
export function DisparuGame({ game }: { game: CatalogueGame }) {
  return <Replayable>{(replay) => <DisparuSession game={game} onReplay={replay} />}</Replayable>;
}
