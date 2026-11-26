import { useEffect, useRef, useState } from 'react';
import { href } from '../../app/router';
import { IconClose, IconStar } from '../../components/icons';
import { Mascot } from '../../components/Mascot';
import { startRecord } from '../../data/history';
import { useActivePlayers } from '../../data/players';
import { useSeance } from '../../data/seance';
import { getSettings, useSettings } from '../../data/settings';
import { useWakeLock } from '../../pwa/useWakeLock';
import { playLevels } from '../activities';
import { gentleEnd } from '../modes';
import {
  BREATHE_ID,
  BREATHE_NAME,
  breathsFor,
  EXERCISES,
  PHASE_MS,
  phases,
  type Exercise,
} from './exercises';
import { playBreath } from './sound';
import './respire.css';

/** Le temps de s'installer avant la première inspiration (la forme part de petit). */
export const SETTLE_MS = 1500;

const PHASE_WORD = { in: 'On inspire', out: 'On souffle' } as const;

function Header({ title }: { title: string }) {
  return (
    <header className="game-header">
      <div className="game-header__bar">
        <a className="icon-btn" href={href('/')} aria-label="Retour à l’accueil">
          <IconClose />
        </a>
      </div>
      <div className="game-header__heading">
        <div>
          <span className="eyebrow">Se calmer</span>
          <h1 className="game-header__title">{title}</h1>
        </div>
      </div>
    </header>
  );
}

/** Son doux facultatif : proposé seulement si les sons de l'appli sont activés. */
function SoundToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const { sounds } = useSettings();
  if (!sounds) return null;
  return (
    <button
      type="button"
      className="respire__sound"
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      <span aria-hidden="true">{on ? '🔔' : '🔕'}</span> Son doux
    </button>
  );
}

function Choose({
  sound,
  onSound,
  onPick,
}: {
  sound: boolean;
  onSound: (on: boolean) => void;
  onPick: (e: Exercise) => void;
}) {
  return (
    <main className="screen">
      <Header title={BREATHE_NAME} />
      <p className="lead">
        Le parent fait l’exercice avec l’enfant. On respire doucement, en suivant la forme : elle
        grossit quand on inspire, elle rapetisse quand on souffle.
      </p>
      <ul className="respire__list" aria-label="Exercices">
        {EXERCISES.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              className={`respire__pick game-tile--${e.tint}`}
              onClick={() => onPick(e)}
            >
              <span className="respire__pick-emoji" aria-hidden="true">
                {e.emoji.in}
              </span>
              <span>{e.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <SoundToggle on={sound} onChange={onSound} />
    </main>
  );
}

/**
 * L'exercice : la forme grossit (3 s) puis rapetisse (4 s), sans pause entre les deux.
 * Aucun compte à rebours ni compteur : l'exercice s'arrête avec l'animation.
 * Avec « réduire les animations », la forme ne bouge pas et le texte guide seul.
 */
function Run({
  exercise,
  breaths,
  sound,
  onSound,
  onDone,
  onStop,
}: {
  exercise: Exercise;
  breaths: number;
  sound: boolean;
  onSound: (on: boolean) => void;
  onDone: () => void;
  onStop: () => void;
}) {
  const [list] = useState(() => phases(breaths));
  // -1 : on s'installe, avant la première inspiration.
  const [step, setStep] = useState(-1);
  const phase = step >= 0 ? list[step] : undefined;
  useWakeLock(true);

  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    const ms = phase ? PHASE_MS[phase] : SETTLE_MS;
    const timer = setTimeout(() => {
      if (step + 1 < list.length) setStep(step + 1);
      else done.current();
    }, ms);
    return () => clearTimeout(timer);
  }, [step, phase, list.length]);

  useEffect(() => {
    if (!phase || !sound) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void playBreath(phase).then((s) => (cancelled ? s() : (stop = s)));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [phase, step, sound]);

  return (
    <main className="screen">
      <Header title={exercise.name} />
      <div className="respire__stage">
        <div
          className={`respire__shape game-tile--${exercise.tint}${phase ? ` respire__shape--${phase}` : ''}`}
          data-testid="respire-shape"
          data-phase={phase ?? 'ready'}
          aria-hidden="true"
        >
          <span className="respire__emoji">{exercise.emoji[phase ?? 'in']}</span>
        </div>
      </div>
      <div className="respire__guide" aria-live="polite">
        <p className="respire__word">{phase ? PHASE_WORD[phase] : 'On s’installe…'}</p>
        <p className="lead">{phase ? exercise.text[phase] : 'Prêts ? On respire ensemble.'}</p>
      </div>
      <div className="spacer" />
      <SoundToggle on={sound} onChange={onSound} />
      <button type="button" className="btn btn--secondary btn--block" onClick={onStop}>
        Arrêter
      </button>
    </main>
  );
}

/** Fin : l'animation s'est arrêtée, l'étoile est gagnée ensemble. */
function Done({ onAgain }: { onAgain: () => void }) {
  const gentle = gentleEnd(useSettings().gameMode);
  const { over } = useSeance();
  return (
    <main className="screen result">
      <Mascot mood={gentle || over ? 'sleep' : 'bravo'} size={96} />
      <div className="respire__star" aria-hidden="true">
        <IconStar size={56} />
      </div>
      <h1 className="h1">Tout calmes !</h1>
      <p className="lead">Une étoile gagnée ensemble, bravo d’avoir respiré ensemble.</p>
      {gentle && <p className="lead">C’est l’heure de dormir. Bonne nuit !</p>}
      {over && <p className="lead">On range le téléphone ?</p>}
      <div className="spacer" />
      <div className="answer-bar">
        <a className="btn btn--secondary" href={href('/')}>
          {over ? 'À plus tard' : 'Accueil'}
        </a>
        <button type="button" className="btn btn--primary" onClick={onAgain}>
          Encore une fois
        </button>
      </div>
    </main>
  );
}

/** Écran « Respire comme… » (#/respire) : choisir un exercice, le faire ensemble, une étoile. */
export function BreatheGame() {
  const players = useActivePlayers();
  const { gameLevel } = useSettings();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [done, setDone] = useState(false);
  // Son doux facultatif : coupé par défaut, aucune voix.
  const [sound, setSound] = useState(false);
  const saving = useRef(false);

  const finish = () => {
    setDone(true);
    if (saving.current) return;
    saving.current = true;
    void startRecord({
      gameId: BREATHE_ID,
      rounds: 1,
      played: 1,
      stars: 1,
      mode: getSettings().gameMode,
    }).finally(() => (saving.current = false));
  };

  if (done)
    return (
      <Done
        onAgain={() => {
          setDone(false);
          setExercise(null);
        }}
      />
    );
  if (exercise)
    return (
      <Run
        key={exercise.id}
        exercise={exercise}
        breaths={breathsFor(playLevels(players ?? [], gameLevel))}
        sound={sound}
        onSound={setSound}
        onDone={finish}
        onStop={() => setExercise(null)}
      />
    );
  return <Choose sound={sound} onSound={setSound} onPick={setExercise} />;
}
