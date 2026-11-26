import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { IconPencil } from '../../components/icons';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import { ChoiceBoard } from '../choices/ChoiceBoard';
import { useChoices } from '../choices/useChoices';
import { glyphOption } from '../choices/choices';
import { Replayable } from '../Replayable';
import { useSaved, useSavedDraw } from '../session';
import { seenOf, useMarkSeen } from '../../data/seen';
import { getSettings } from '../../data/settings';
import { orderByLevel } from '../levels';
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns, type Turns } from '../useTurns';
import {
  ALL_GLYPHS,
  CONSTELLATIONS,
  CURSIVE,
  DIGITS,
  glyphLabel,
  glyphName,
  glyphPool,
  glyphTitle,
  LETTERS,
  LOWERCASE,
  NUMBERS,
  type GlyphCard,
} from './bank';
import { GlyphView } from './Glyph';
import { LetterSoundBlock } from './LetterSound';
import { letterSoundOf } from './sons';
import { TracePad } from './TracePad';
import { traceOf } from './trace';

type Mode = 'letters' | 'lower' | 'cursive' | 'digits' | 'numbers' | 'constellations' | 'mix';

/**
 * Sélecteur (#48) : trois écritures, trois sortes de nombres, puis le mélange de tout, sur
 * toute la largeur. Trois colonnes de grands boutons : à portée du pouce sur un petit écran.
 */
const MODES: { value: Mode; label: string }[] = [
  { value: 'letters', label: 'Majuscules' },
  { value: 'lower', label: 'Minuscules' },
  { value: 'cursive', label: 'Attaché' },
  { value: 'digits', label: 'Chiffres' },
  { value: 'numbers', label: 'Nombres' },
  { value: 'constellations', label: 'Dés, doigts' },
  { value: 'mix', label: 'Mélange' },
];

const GAME = 'lettres';

interface Place {
  mode: Mode;
  /** Position dans chaque paquet. */
  pos: Record<Mode, number>;
}

const NO_POS = Object.fromEntries(MODES.map((m) => [m.value, 0])) as Record<Mode, number>;
const START: Place = { mode: 'letters', pos: NO_POS };

const idOf = (card: GlyphCard) => card.id;

/**
 * Paquet mélangé, les glyphes du niveau de la partie d'abord (#40). Chacun son tour (#38) :
 * un glyphe par manche, au niveau de l'enfant de la manche.
 */
const byLevel = (cards: GlyphCard[], turns: Turns | null, rounds: number) => {
  // Les glyphes pas encore vus d'abord (#55).
  const seen = seenOf(GAME, cards, idOf);
  return turns
    ? drawForTurns(cards, turns.levels(rounds), (c) => c.level, undefined, seen)
    : orderByLevel(cards, getSettings().gameLevel, (c) => c.level, undefined, seen);
};

/** Familles où l'enfant peut repasser le glyphe au doigt (#49). */
const TRACE_MODES: readonly Mode[] = ['letters', 'digits'];

const restoreTrace = (saved: unknown) => (typeof saved === 'boolean' ? saved : undefined);

/** Partie retrouvée ; un paquet sans position (partie d'avant le #48) repart du début. */
function restorePlace(saved: unknown): Place | undefined {
  const p = saved as Partial<Place> | null;
  if (!p || !MODES.some((m) => m.value === p.mode) || typeof p.pos !== 'object' || !p.pos)
    return undefined;
  const pos = { ...NO_POS };
  for (const m of MODES) {
    const v: unknown = p.pos[m.value];
    if (v === undefined) continue;
    if (!(Number.isInteger(v) && (v as number) >= 0)) return undefined;
    pos[m.value] = v as number;
  }
  return { mode: p.mode!, pos };
}

/**
 * Une manche : le glyphe en grand et la consigne du parent (aussi jouée dans le Grand Jeu).
 * Avec `pool` et « Répondre en montrant » (#123), des glyphes au choix remplacent le glyphe :
 * le parent demande, l'enfant montre. Avec `trace` (#49), une majuscule ou un chiffre
 * s'affiche en pointillés et l'enfant le repasse du doigt. Pour une lettre, le parent a aussi
 * son son, trois mots et une question (#50).
 */
export function GlyphRound({
  card,
  pool,
  trace,
}: {
  card: GlyphCard;
  pool?: readonly GlyphCard[];
  trace?: boolean;
}) {
  const choices = useChoices(pool && glyphOption(card), pool?.map(glyphOption));
  const model = trace ? traceOf(card) : undefined;
  // Le son de la lettre (#50) : majuscules, minuscules et attaché.
  const sound = letterSoundOf(card);
  return (
    <>
      {model ? (
        <TracePad strokes={model} label={glyphLabel(card)} />
      ) : choices ? (
        <ChoiceBoard options={choices} answer={card.glyph} />
      ) : (
        <figure className="glyph-card round-in">
          <GlyphView
            glyph={card.glyph}
            set={card.set}
            className="glyph-card__glyph"
            label={glyphLabel(card)}
          />
          <figcaption className="muted">Montre l'écran à l'enfant</figcaption>
        </figure>
      )}

      <ParentBlock prolonger={card.prolonger}>
        {model && (
          <p>
            L’enfant repasse <strong>{glyphName(card)}</strong> du doigt.{' '}
            <strong>Voir le tracé</strong> le montre en mouvement.
          </p>
        )}
        {!model && choices && (
          <p>
            Demande à l’enfant de montrer : <strong>{glyphName(card)}</strong>
          </p>
        )}
        {card.hint}
        <ReadAloud text={card.hint} />
        {sound && <LetterSoundBlock sound={sound} />}
      </ParentBlock>
    </>
  );
}

function LettersSession({ onReplay }: { onReplay: () => void }) {
  // Un paquet mélangé par mode, parcouru sans répétition ; on recommence s'il est épuisé.
  // Tirage, mode et position sont retrouvés après un rafraîchissement.
  const turns = useTurns(GAME);
  const setting = useRoundSetting();
  const draw = (cards: GlyphCard[]) => () => byLevel(cards, turns, setting);
  const decks: Record<Mode, GlyphCard[]> = {
    letters: useSavedDraw(GAME, 'letters', LETTERS, draw(LETTERS), idOf),
    lower: useSavedDraw(GAME, 'lower', LOWERCASE, draw(LOWERCASE), idOf),
    cursive: useSavedDraw(GAME, 'cursive', CURSIVE, draw(CURSIVE), idOf),
    digits: useSavedDraw(GAME, 'digits', DIGITS, draw(DIGITS), idOf),
    numbers: useSavedDraw(GAME, 'numbers', NUMBERS, draw(NUMBERS), idOf),
    constellations: useSavedDraw(
      GAME,
      'constellations',
      CONSTELLATIONS,
      draw(CONSTELLATIONS),
      idOf,
    ),
    mix: useSavedDraw(GAME, 'mix', ALL_GLYPHS, draw(ALL_GLYPHS), idOf),
  };
  const [{ mode, pos }, setPlace] = useSaved<Place>(GAME, 'place', () => START, restorePlace);
  const { round, rounds, stars, finished, answer, team, teams } = useRounds(
    GAME,
    undefined,
    turns?.order,
  );
  const setMode = (m: Mode) => setPlace({ mode: m, pos });
  // Tracé au doigt (#49) : choix gardé d'une manche à l'autre, et après un rafraîchissement.
  const [trace, setTrace] = useSaved(GAME, 'trace', () => false, restoreTrace);
  const canTrace = TRACE_MODES.includes(mode);

  const deck = decks[mode];
  // Chacun son tour : la carte de la manche, au niveau de l'enfant, quel que soit le paquet.
  const card = deck[(turns ? round - 1 : pos[mode]) % deck.length];
  useMarkSeen(GAME, finished ? undefined : card.id);

  if (finished)
    return <GameResult stars={stars} rounds={rounds} teams={teams} onReplay={onReplay} />;

  const tracing = canTrace && trace && !!traceOf(card);
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
        title={glyphTitle(card.set)}
        player={turns?.playerAt(round)}
        team={team}
      />

      <div className="segmented segmented--glyphs" role="radiogroup" aria-label="Que montrer ?">
        {MODES.map((m) => (
          <label key={m.value} className={m.value === 'cursive' ? 'is-cursive' : undefined}>
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

      {canTrace && (
        <button
          type="button"
          className="btn btn--secondary trace-toggle"
          aria-pressed={trace}
          onClick={() => setTrace(!trace)}
        >
          <IconPencil size={20} />
          Tracer au doigt
        </button>
      )}

      {/* key : chaque manche (ou changement de paquet) entre en douceur, choix retirés. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <GlyphRound
          key={`${round}:${mode}:${tracing}`}
          card={card}
          pool={glyphPool(card)}
          trace={tracing}
        />
      </TurnPlayer.Provider>

      <div className="spacer" />
      <AnswerBar
        onSkip={() => next(false)}
        onFound={() => next(true)}
        foundLabel={tracing ? 'C’est tracé' : undefined}
      />
    </main>
  );
}

export function LettersGame() {
  return <Replayable>{(replay) => <LettersSession onReplay={replay} />}</Replayable>;
}
