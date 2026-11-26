import { useRef, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { isRightAnswer, newQuestion, unlock } from '../data/parentLock';

/** Écran du verrou parent : une addition à résoudre avant d'entrer. */
export function ParentGate() {
  const [question, setQuestion] = useState(() => newQuestion());
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (isRightAnswer(question, answer)) {
      unlock();
      return;
    }
    // Nouvelle opération : impossible de trouver en essayant tous les nombres sur la même.
    setQuestion(newQuestion());
    setAnswer('');
    setError('Ce n’est pas ça. Voici une autre opération.');
    input.current?.focus();
  }

  return (
    <main className="screen">
      <ScreenHeader title="Espace parent" back="/" />
      <p className="lead">Une petite question pour les grands avant d’entrer.</p>

      <form className="parent-gate" onSubmit={onSubmit}>
        <label htmlFor="parent-gate-answer" className="parent-gate__question">
          <span aria-hidden="true">
            {question.a} + {question.b} = ?
          </span>
          <span className="sr-only">
            Combien font {question.a} plus {question.b} ?
          </span>
        </label>
        <input
          ref={input}
          id="parent-gate-answer"
          className="field parent-gate__answer"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={2}
          value={answer}
          aria-describedby={error ? 'parent-gate-error' : undefined}
          onChange={(e) => setAnswer(e.target.value.replace(/\D/g, ''))}
        />
        <Button type="submit" block disabled={!answer}>
          Entrer
        </Button>
      </form>

      {error && (
        <p id="parent-gate-error" className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
