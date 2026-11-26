import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import { ChoiceBoard } from '../choices/ChoiceBoard';
import { useChoices } from '../choices/useChoices';
import { glyphOption } from '../choices/choices';
import { Replayable } from '../Replayable';
import { useSaved, useSavedDraw } from '../session';
import { getSettings } from '../../data/settings';
import { orderByLevel } from '../levels';
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns, type Turns } from '../useTurns';
import { DIGITS, LETTERS, type GlyphCard } from './bank';

type Mode = 'letters' | 'digits';

const MODES: { value: Mode; label: string }[] = [
  { value: 'letters', label: 'Lettres' },
  { value: 'digits', label: 'Chiffres' },
];

const GAME = 'lettres';

interface Place {
  mode: Mode;
  /** Position dans chaque paquet. */
  pos: Record<Mode, number>;
}

const START: Place = { mode: 'letters', pos: { letters: 0, digits: 0 } };

const glyphOf = (card: GlyphCard) => card.glyph;

/**
 * Paquet mélangé, les glyphes du niveau de la partie d'abord (#40). Chacun son tour (#38) :
 * un glyphe par manche, au niveau de l'enfant de la manche.
 */
const byLevel = (cards: GlyphCard[], turns: Turns | null, rounds: number) =>
  turns
    ? drawForTurns(cards, turns.levels(rounds), (c) => c.level)
    : orderByLevel(cards, getSettings().gameLevel, (c) => c.level);

function restorePlace(saved: unknown): Place | undefined {
  const p = saved as Partial<Place> | null;
  const n = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;
  return p && MODES.some((m) => m.value === p.mode) && n(p.pos?.letters) && n(p.pos?.digits)
    ? (p as Place)
    : undefined;
}

/**
 * Une manche : le glyphe en grand et la consigne du parent (aussi jouée dans le Grand Jeu).
 * Avec `pool` et « Répondre en montrant » (#123), des glyphes au choix remplacent le glyphe :
 * le parent demande, l'enfant montre.
 */
export function GlyphRound({ card, pool }: { card: GlyphCard; pool?: readonly GlyphCard[] }) {
  const choices = useChoices(pool && glyphOption(card), pool?.map(glyphOption));
  return (
    <>
      {choices ? (
        <ChoiceBoard options={choices} answer={card.glyph} />
      ) : (
        <figure className="glyph-card round-in">
          <span className="glyph-card__glyph" data-testid="glyph">
            {card.glyph}
          </span>
          <figcaption className="muted">Montre l'écran à l'enfant</figcaption>
        </figure>
      )}

      <ParentBlock>
        {choices && (
          <p>
            Demande à l’enfant de montrer :{' '}
            <strong>
              {/^\d$/.test(card.glyph) ? 'le chiffre' : 'la lettre'} {card.glyph}
            </strong>
          </p>
        )}
        {card.hint}
        <ReadAloud text={card.hint} />
      </ParentBlock>
    </>
  );
}

function LettersSession({ onReplay }: { onReplay: () => void }) {
  // Un paquet mélangé par mode, parcouru sans répétition ; on recommence s'il est épuisé.
  // Tirage, mode et position sont retrouvés après un rafraîchissement.
  const turns = useTurns(GAME);
  const setting = useRoundSetting();
  const decks = {
    letters: useSavedDraw(
      GAME,
      'letters',
      LETTERS,
      () => byLevel(LETTERS, turns, setting),
      glyphOf,
    ),
    digits: useSavedDraw(GAME, 'digits', DIGITS, () => byLevel(DIGITS, turns, setting), glyphOf),
  };
  const [{ mode, pos }, setPlace] = useSaved<Place>(GAME, 'place', () => START, restorePlace);
  const { round, rounds, stars, finished, answer, team, teams } = useRounds(
    GAME,
    undefined,
    turns?.order,
  );
  const setMode = (m: Mode) => setPlace({ mode: m, pos });

  if (finished)
    return <GameResult stars={stars} rounds={rounds} teams={teams} onReplay={onReplay} />;

  const deck = decks[mode];
  // Chacun son tour : la carte de la manche, au niveau de l'enfant, quel que soit le paquet.
  const card = deck[(turns ? round - 1 : pos[mode]) % deck.length];
  const next = (found: boolean) => {
    setPlace({ mode, pos: { ...pos, [mode]: pos[mode] + 1 } });
    answer(found);
  };

  return (
    <main className="screen">
      <GameHeader
        round={round}
        rounds={rounds}
        stars={stars}
        category="Lettres et chiffres"
        title={mode === 'letters' ? 'Quelle lettre ?' : 'Quel chiffre ?'}
        player={turns?.playerAt(round)}
        team={team}
      />

      <div className="segmented segmented--2" role="radiogroup" aria-label="Type d'image">
        {MODES.map((m) => (
          <label key={m.value}>
            <input
              type="radio"
              name="mode"
              value={m.value}
              checked={mode === m.value}
              onChange={() => setMode(m.value)}
            />
            {m.label}
          </label>
        ))}
      </div>

      {/* key : chaque manche (ou changement de paquet) entre en douceur, choix retirés. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <GlyphRound key={`${round}:${mode}`} card={card} pool={deck} />
      </TurnPlayer.Provider>

      <div className="spacer" />
      <AnswerBar onSkip={() => next(false)} onFound={() => next(true)} />
    </main>
  );
}

export function LettersGame() {
  return <Replayable>{(replay) => <LettersSession onReplay={replay} />}</Replayable>;
}
