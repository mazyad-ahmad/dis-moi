import { useMemo, useState } from 'react';
import { AnswerBar } from '../../components/AnswerBar';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { ParentBlock } from '../../components/ParentBlock';
import { Replayable } from '../Replayable';
import { shuffle } from '../shuffle';
import { useRounds } from '../useRounds';
import { DIGITS, LETTERS } from './bank';

type Mode = 'letters' | 'digits';

const MODES: { value: Mode; label: string }[] = [
  { value: 'letters', label: 'Lettres' },
  { value: 'digits', label: 'Chiffres' },
];

function LettersSession({ onReplay }: { onReplay: () => void }) {
  const { round, rounds, stars, finished, answer } = useRounds('lettres');
  const [mode, setMode] = useState<Mode>('letters');
  // Un paquet mélangé par mode, parcouru sans répétition ; on remélange s'il est épuisé.
  const decks = useMemo(() => ({ letters: shuffle(LETTERS), digits: shuffle(DIGITS) }), []);
  const [pos, setPos] = useState({ letters: 0, digits: 0 });

  if (finished) return <GameResult stars={stars} rounds={rounds} onReplay={onReplay} />;

  const deck = decks[mode];
  const card = deck[pos[mode] % deck.length];
  const next = (found: boolean) => {
    setPos((p) => ({ ...p, [mode]: p[mode] + 1 }));
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

      <figure className="glyph-card">
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
