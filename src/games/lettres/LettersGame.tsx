import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { ParentBlock } from '../../components/ParentBlock';
import { Replayable } from '../Replayable';
import { useSaved, useSavedDraw } from '../session';
import { shuffle } from '../shuffle';
import { useRounds } from '../useRounds';
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

function restorePlace(saved: unknown): Place | undefined {
  const p = saved as Partial<Place> | null;
  const n = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;
  return p && MODES.some((m) => m.value === p.mode) && n(p.pos?.letters) && n(p.pos?.digits)
    ? (p as Place)
    : undefined;
}

function LettersSession({ onReplay }: { onReplay: () => void }) {
  // Un paquet mélangé par mode, parcouru sans répétition ; on recommence s'il est épuisé.
  // Tirage, mode et position sont retrouvés après un rafraîchissement.
  const decks = {
    letters: useSavedDraw(GAME, 'letters', LETTERS, () => shuffle(LETTERS), glyphOf),
    digits: useSavedDraw(GAME, 'digits', DIGITS, () => shuffle(DIGITS), glyphOf),
  };
  const [{ mode, pos }, setPlace] = useSaved<Place>(GAME, 'place', () => START, restorePlace);
  const { round, rounds, stars, finished, answer } = useRounds(GAME);
  const setMode = (m: Mode) => setPlace({ mode: m, pos });

  if (finished) return <GameResult stars={stars} rounds={rounds} onReplay={onReplay} />;

  const deck = decks[mode];
  const card = deck[pos[mode] % deck.length];
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

      {/* key : chaque manche entre en douceur. */}
      <figure key={round} className="glyph-card round-in">
        <span className="glyph-card__glyph" data-testid="glyph">
          {card.glyph}
        </span>
        <figcaption className="muted">Montre l'écran à l'enfant</figcaption>
      </figure>

      <ParentBlock>{card.hint}</ParentBlock>

      <div className="spacer" />
      <AnswerBar onSkip={() => next(false)} onFound={() => next(true)} />
    </main>
  );
}

export function LettersGame() {
  return <Replayable>{(replay) => <LettersSession onReplay={replay} />}</Replayable>;
}
