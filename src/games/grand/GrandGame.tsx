import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { Mascot } from '../../components/Mascot';
import { useCustomGames } from '../../data/customGames';
import { getSettings, useSettings } from '../../data/settings';
import { TileIcon } from '../../screens/HomeGames';
import { SongRound } from '../chanson/SongGame';
import { SONGS } from '../chanson/songs';
import { deckChoicePool } from '../choices/choices';
import { DeckRound } from '../deck/DeckGame';
import { DrawingBoard } from '../dessin/DrawingGame';
import { glyphPool } from '../lettres/bank';
import { GlyphRound } from '../lettres/LettersGame';
import { modeDrawSeconds } from '../modes';
import { Replayable } from '../Replayable';
import { revealOn } from '../reveal/reveal';
import { TreasureRound } from '../tresor/TreasureGame';
import { TREASURE_ID, treasureSeconds, treasureWay } from '../tresor/treasure';
import { IntrusRound } from '../intrus/IntrusGame';
import { INTRUS_ID } from '../intrus/intrus';
import { useSaved } from '../session';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns } from '../useTurns';
import {
  GRAND_ID,
  announce,
  GRAND_NAME,
  planRounds,
  resolvePlan,
  type GrandGame as Game,
  type GrandRound,
  type PlannedRound,
} from './pool';
import { useGrandPool } from './useGrand';
import './grand.css';

/** Durée de l'écran-éclair qui annonce le jeu de la manche (un appui le passe). */
export const FLASH_MS = 2000;

type Heading = Omit<ComponentProps<typeof GameHeader>, 'aside'>;

/** Titre de la manche : « Quel chiffre ? » pour un chiffre tiré dans « Quelle lettre ? ». */
function titleOf({ game, card }: GrandRound): string {
  return card.type === 'glyph' && /^\d$/.test(card.glyph.glyph) ? 'Quel chiffre ?' : game.name;
}

/** Cartes du jeu de la manche où tirer les choix de « Répondre en montrant » (#123). */
function deckPool(game: Game) {
  const items = game.cards.flatMap((c) => (c.type === 'deck' ? [c.item] : []));
  const kind = game.cards.find((c) => c.type === 'deck')?.kind;
  return kind ? deckChoicePool({ id: game.id, kind, items }) : undefined;
}

/** Écran-éclair : annonce le jeu de la manche, puis laisse place à la manche. */
function Flash({ heading, game, onGo }: { heading: Heading; game: Game; onGo: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onGo, FLASH_MS);
    return () => clearTimeout(timer);
  }, [onGo]);
  return (
    <main className="screen">
      <GameHeader {...heading} />
      <button type="button" className={`grand-flash game-tile--${game.tint}`} onClick={onGo}>
        <span aria-hidden="true">
          <TileIcon game={game} />
        </span>
        <strong className="grand-flash__text">{announce(heading.title)}</strong>
        <span className="grand-flash__go">C’est parti !</span>
      </button>
    </main>
  );
}

/** Manche de dessin : minuteur du dessin, « Autre mot » pris dans le même jeu. */
function DrawRound({
  game,
  word,
  turn,
  heading,
  seconds,
  onAnswer,
}: {
  game: Game;
  word: string;
  turn: number;
  heading: Heading;
  seconds: number;
  onAnswer: (found: boolean) => void;
}) {
  const words = game.cards.flatMap((c) => (c.type === 'draw' ? [c.word] : []));
  const start = Math.max(0, words.indexOf(word));
  const [other, setOther] = useState(0);
  return (
    <DrawingBoard
      heading={heading}
      word={words[(start + other) % words.length]}
      turn={`${turn}:${other}`}
      seconds={seconds}
      onOtherWord={words.length > 1 ? () => setOther(other + 1) : undefined}
      onAnswer={onAnswer}
    />
  );
}

function GrandSession({ games, onReplay }: { games: Game[]; onReplay: () => void }) {
  const setting = useRoundSetting();
  const turns = useTurns(GRAND_ID);
  // Manches prévues au lancement, retrouvées après un rafraîchissement.
  const [plan] = useSaved<PlannedRound[]>(
    GRAND_ID,
    'plan',
    // Chacun son tour (#38) : niveau de l'enfant de chaque manche ; en équipe, niveau de la partie.
    () =>
      planRounds(games, setting, Math.random, turns?.levels(setting) ?? getSettings().gameLevel),
    (saved) => (resolvePlan(saved, games) ? (saved as PlannedRound[]) : undefined),
  );
  const [planned] = useState(() => resolvePlan(plan, games)!);
  const { round, rounds, stars, finished, answer, team, teams } = useRounds(
    GRAND_ID,
    planned.length,
    turns?.order,
  );
  // Durée du minuteur de dessin (aucun en mode Coucher), figée pour la partie.
  const [seconds] = useState(() =>
    modeDrawSeconds(getSettings().drawSeconds, getSettings().gameMode),
  );
  // Chasse au trésor (#60) : partout dans la maison, sauf au Coucher et en Voiture.
  const [mode] = useState(() => getSettings().gameMode);
  const hunt = treasureWay('run', mode);
  // Dernière manche déjà annoncée par l'écran-éclair.
  const [announced, setAnnounced] = useState(0);
  const go = useCallback(() => setAnnounced(round), [round]);
  // Image cachée (#62) : comme dans le jeu d'origine.
  const { revealCatalogue } = useSettings();
  const custom = useCustomGames();

  if (finished)
    return <GameResult stars={stars} rounds={rounds} teams={teams} onReplay={onReplay} />;

  const current = planned[round - 1];
  const { game, card } = current;
  const heading: Heading = {
    round,
    rounds,
    stars,
    category: GRAND_NAME,
    title: titleOf(current),
    player: turns?.playerAt(round),
    team,
  };

  if (announced < round) return <Flash key={round} heading={heading} game={game} onGo={go} />;

  if (card.type === 'draw')
    return (
      <DrawRound
        key={round}
        game={game}
        word={card.word}
        turn={round}
        heading={heading}
        seconds={seconds}
        onAnswer={answer}
      />
    );

  const intrus = card.type === 'deck' && game.id === INTRUS_ID;
  const later =
    card.type === 'song' || intrus || (card.type === 'deck' && card.kind === 'question');
  return (
    <main className="screen">
      <GameHeader {...heading} />
      {/* key : nouvelle manche = carte, indices et réponse remis à zéro. */}
      <TurnPlayer.Provider value={heading.player}>
        {card.type === 'song' && <SongRound key={round} song={card.song} pool={SONGS} />}
        {card.type === 'glyph' && (
          <GlyphRound key={round} card={card.glyph} pool={glyphPool(card.glyph)} />
        )}
        {card.type === 'deck' && game.id === TREASURE_ID && (
          <TreasureRound
            key={round}
            item={card.item}
            way={hunt}
            seconds={treasureSeconds(hunt, mode)}
          />
        )}
        {card.type === 'deck' && intrus && <IntrusRound key={round} item={card.item} />}
        {card.type === 'deck' && game.id !== TREASURE_ID && !intrus && (
          <DeckRound
            key={round}
            kind={card.kind}
            item={card.item}
            pool={deckPool(game)}
            reveal={revealOn(game.id, revealCatalogue, custom)}
          />
        )}
      </TurnPlayer.Provider>
      <div className="spacer" />
      <AnswerBar
        onSkip={() => answer(false)}
        onFound={() => answer(true)}
        skipLabel={later ? 'Pas encore' : 'Passer'}
      />
    </main>
  );
}

/** Le Grand Jeu (#41) : chaque manche, un jeu différent de l'accueil. */
export function GrandGame() {
  const pool = useGrandPool();
  if (pool === undefined) return <main className="screen" />;
  if (!pool.included.length)
    return (
      <main className="screen">
        <GameHeader category="Tous les jeux" title={GRAND_NAME} />
        <div className="empty">
          <Mascot mood="think" />
          <strong>Pas encore de jeu à mélanger</strong>
        </div>
      </main>
    );
  return (
    <Replayable>{(replay) => <GrandSession games={pool.included} onReplay={replay} />}</Replayable>
  );
}
