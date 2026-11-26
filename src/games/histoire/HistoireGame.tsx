import { useEffect, useRef, useState } from 'react';
import { useRecording } from '../../audio/recording';
import { AnswerBar } from '../../components/AnswerBar';
import { Button } from '../../components/Button';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { IconMic, IconPause, IconPlay, IconStop } from '../../components/icons';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import type { PackItem } from '../../content/packs';
import type { Story } from '../../data/db';
import { canRecord, useRecorder } from '../../data/media';
import { getSettings } from '../../data/settings';
import { addStory, MAX_STORIES, MAX_STORY_SECONDS, useStoryCount } from '../../data/stories';
import { cardLevel, drawForLevel } from '../levels';
import { Replayable } from '../Replayable';
import { useSavedDraw } from '../session';
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns } from '../useTurns';
import {
  capitalize,
  HEROES,
  HISTOIRE_CATEGORY,
  HISTOIRE_ID,
  HISTOIRE_NAME,
  MAX_STORY_ROUNDS,
  NO_STAR_MESSAGE,
  OBJECTS,
  PLACES,
  STORY_PROMPTS,
  storyStart,
  THANKS_LABEL,
} from './histoire';
import { STORY_PARTS } from './parts';
import './histoire.css';

const itemKey = (item: PackItem) => item.id;

/**
 * Enregistrer l'histoire, seulement sur un appui du parent (facultatif). L'histoire est gardée
 * sur le téléphone, dans le Livre d'histoires. Si on change de manche ou quitte le jeu pendant
 * l'enregistrement, il s'arrête et l'histoire est gardée.
 */
function StoryRecorder({ parts }: { parts: Story['parts'] }) {
  const count = useStoryCount();
  const [saved, setSaved] = useState<Blob | undefined>();
  const [full, setFull] = useState(false);
  const { state, start, stop } = useRecorder((audio) => {
    void addStory(audio, parts).then((id) => (id === null ? setFull(true) : setSaved(audio)));
  }, MAX_STORY_SECONDS);
  const replay = useRecording(saved);
  // Changer de manche ou quitter le jeu arrête le micro ; l'histoire est gardée.
  const stopOnLeave = useRef(stop);
  useEffect(() => {
    stopOnLeave.current = stop;
  });
  useEffect(() => () => stopOnLeave.current(), []);

  if (state === 'recording')
    return (
      <div className="media-row">
        <Button variant="danger" icon={<IconStop size={18} />} onClick={stop}>
          Arrêter l’enregistrement
        </Button>
        <span className="muted" role="status">
          Enregistrement… ({MAX_STORY_SECONDS / 60} minutes maximum)
        </span>
      </div>
    );
  if (saved)
    return (
      <div className="media-row">
        <Button
          variant="secondary"
          icon={replay.playing ? <IconPause size={20} /> : <IconPlay size={20} />}
          onClick={replay.toggle}
        >
          {replay.playing ? 'Arrêter' : 'Réécouter l’histoire'}
        </Button>
        <span className="muted" role="status">
          Gardée dans le Livre d’histoires (espace Parent).
        </span>
      </div>
    );
  if (full || (count ?? 0) >= MAX_STORIES)
    return (
      <p className="muted" role="status">
        Le Livre d’histoires est plein ({MAX_STORIES} histoires) : supprimes-en une dans l’espace
        Parent pour en garder une nouvelle.
      </p>
    );
  return (
    <div className="media-row">
      <Button variant="secondary" icon={<IconMic size={20} />} onClick={() => void start()}>
        Enregistrer l’histoire
      </Button>
      <span className="muted" role="status">
        {state === 'denied'
          ? 'Autorise le micro pour enregistrer l’histoire.'
          : 'Facultatif : l’enregistrement reste sur ce téléphone.'}
      </span>
    </div>
  );
}

/** Une manche : le héros, le lieu et l'objet tirés, la phrase de départ et la zone du parent. */
export function StoryRound({
  hero,
  place,
  object,
}: {
  hero: PackItem;
  place: PackItem;
  object: PackItem;
}) {
  const items = [hero, place, object];
  const start = storyStart(hero, place, object);
  const [mic] = useState(canRecord);
  return (
    <div className="deck-round round-in">
      <section className="deck-card story-card" aria-label="Histoire">
        <ul className="story-parts">
          {items.map((item, i) => (
            <li key={item.id} className="story-part">
              <span className="story-part__emoji" aria-hidden="true">
                {item.emoji}
              </span>
              <span className="story-part__role">{STORY_PARTS[i].name}</span>
              <strong className="story-part__word">{capitalize(item.answer)}</strong>
            </li>
          ))}
        </ul>
        <p className="story-start">{start}</p>
        <ReadAloud text={start} />
      </section>
      <ParentBlock>
        <p>Pas de bonne réponse : l’enfant invente la suite. Pour l’aider à continuer :</p>
        <ul className="story-prompts" aria-label="Relances">
          {STORY_PROMPTS.map((p) => (
            <li key={p}>« {p} »</li>
          ))}
        </ul>
        {mic ? (
          <StoryRecorder parts={items.map(({ answer, emoji }) => ({ answer, emoji: emoji! }))} />
        ) : (
          <p className="muted">Rien n’est enregistré : l’histoire reste entre vous.</p>
        )}
      </ParentBlock>
    </div>
  );
}

function HistoireSession({ onReplay }: { onReplay: () => void }) {
  const setting = Math.min(useRoundSetting(), MAX_STORY_ROUNDS);
  const turns = useTurns(HISTOIRE_ID);
  // Tirage figé pour la partie (repris après un rafraîchissement) : un héros, un lieu et un
  // objet par manche, au niveau de la partie ou, chacun son tour, de l'enfant de la manche.
  const make = (items: readonly PackItem[]) => () =>
    turns
      ? drawForTurns(items, turns.levels(setting), cardLevel)
      : drawForLevel(items, setting, getSettings().gameLevel, cardLevel);
  const heroes = useSavedDraw(HISTOIRE_ID, 'heros', HEROES, make(HEROES), itemKey);
  const places = useSavedDraw(HISTOIRE_ID, 'lieux', PLACES, make(PLACES), itemKey);
  const objects = useSavedDraw(HISTOIRE_ID, 'objets', OBJECTS, make(OBJECTS), itemKey);
  const count = Math.min(heroes.length, places.length, objects.length);
  const { round, rounds, stars, finished, answer, team, teams } = useRounds(
    HISTOIRE_ID,
    count,
    turns?.order,
  );

  if (finished)
    return (
      <GameResult
        stars={stars}
        rounds={rounds}
        teams={teams}
        onReplay={onReplay}
        message={stars > 0 ? undefined : NO_STAR_MESSAGE}
      />
    );

  return (
    <main className="screen">
      <GameHeader
        round={round}
        rounds={rounds}
        stars={stars}
        category={HISTOIRE_CATEGORY}
        title={HISTOIRE_NAME}
        player={turns?.playerAt(round)}
        team={team}
      />
      {/* key : nouvelle manche = nouvelles images, qui entrent en douceur. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <StoryRound
          key={round}
          hero={heroes[round - 1]}
          place={places[round - 1]}
          object={objects[round - 1]}
        />
      </TurnPlayer.Provider>
      <div className="spacer" />
      <AnswerBar
        onSkip={() => answer(false)}
        onFound={() => answer(true)}
        skipLabel="Passer"
        foundLabel={THANKS_LABEL}
      />
    </main>
  );
}

export function HistoireGame() {
  return <Replayable>{(replay) => <HistoireSession onReplay={replay} />}</Replayable>;
}
