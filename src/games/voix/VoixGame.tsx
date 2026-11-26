import { useEffect, useRef, useState } from 'react';
import { AnswerBar } from '../../components/AnswerBar';
import { Button } from '../../components/Button';
import { GameHeader } from '../../components/GameHeader';
import { GameResult } from '../../components/GameResult';
import { IconMic, IconPlay, IconStop } from '../../components/icons';
import { ParentBlock } from '../../components/ParentBlock';
import { ReadAloud } from '../../components/ReadAloud';
import type { PackItem } from '../../content/packs';
import { canRecord, useRecorder } from '../../data/media';
import { getSettings } from '../../data/settings';
import { cardLevel, drawForLevel } from '../levels';
import { Replayable } from '../Replayable';
import { useSavedDraw } from '../session';
import { drawForTurns } from '../turns';
import { useRoundSetting, useRounds } from '../useRounds';
import { TurnPlayer, useTurns } from '../useTurns';
import { EFFECTS, effectInfo, playVoice, stopVoice, type VoiceEffect } from './effects';
import {
  CHALLENGE_NAME,
  challengeAt,
  PHRASES,
  surpriseEffect,
  VOICE_MAX_SECONDS,
  VOIX_CATEGORY,
  VOIX_ID,
  VOIX_NAME,
  type Challenge,
} from './voix';
import '../choices/choices.css';
import './voix.css';

const phraseKey = (item: PackItem) => item.id;

const KEPT_NOTE = 'Le son reste sur le téléphone et s’efface à la fin de la manche.';

/** Les quatre voix en gros boutons ; celle qui joue est marquée. */
function EffectButtons({
  playing,
  onPlay,
  label,
}: {
  playing: VoiceEffect | null;
  onPlay: (effect: VoiceEffect) => void;
  label: string;
}) {
  return (
    <div className="voix-effects" role="group" aria-label={label}>
      {EFFECTS.map((e) => (
        <button
          key={e.id}
          type="button"
          className="choice voix-effect"
          aria-pressed={playing === e.id}
          onClick={() => onPlay(e.id)}
        >
          <span className="choice__visual">
            <span className="choice__emoji" aria-hidden="true">
              {e.emoji}
            </span>
            <span className="choice__caption">{e.name}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Une phrase enregistrée, rejouée avec un effet. L'enregistrement n'existe que dans l'état de
 * la manche : à la manche suivante (ou en quittant), la voix s'arrête et le son est oublié.
 */
function useVoiceClip() {
  const [audio, setAudio] = useState<Blob | null>(null);
  const [playing, setPlaying] = useState<VoiceEffect | null>(null);
  const [failed, setFailed] = useState(false);
  const request = useRef(0);
  const recorder = useRecorder((clip) => setAudio(clip), VOICE_MAX_SECONDS);

  // Fin de la manche : la voix s'arrête, l'enregistrement est oublié.
  useEffect(
    () => () => {
      request.current++;
      stopVoice();
    },
    [],
  );

  const play = (effect: VoiceEffect) => {
    if (!audio) return;
    const id = ++request.current;
    setFailed(false);
    setPlaying(effect);
    void playVoice(audio, effect).then((p) => {
      if (id !== request.current) return p?.stop();
      if (!p) {
        setPlaying(null);
        setFailed(true);
        return;
      }
      void p.ended.then(() => {
        if (id === request.current) setPlaying(null);
      });
    });
  };

  const stop = () => {
    request.current++;
    stopVoice();
    setPlaying(null);
  };

  const record = () => {
    stop();
    setAudio(null);
    void recorder.start();
  };

  return { audio, playing, failed, play, stop, record, recorder };
}

type Clip = ReturnType<typeof useVoiceClip>;

/** Enregistrer la phrase, ou l'arrêter ; état lu par le lecteur d'écran. */
function RecordControls({ clip }: { clip: Clip }) {
  const { recorder, audio } = clip;
  return (
    <div className="voix-record">
      {recorder.state === 'recording' ? (
        <Button variant="danger" icon={<IconStop size={18} />} onClick={recorder.stop}>
          Arrêter
        </Button>
      ) : (
        <Button
          variant={audio ? 'secondary' : 'primary'}
          icon={<IconMic size={20} />}
          onClick={clip.record}
        >
          {audio ? 'Réenregistrer' : 'Enregistrer la phrase'}
        </Button>
      )}
      <p className="muted" role="status">
        {recorder.state === 'recording' &&
          `On t’écoute… (${VOICE_MAX_SECONDS} s maximum, rien ne quitte le téléphone)`}
        {recorder.state === 'denied' &&
          'Le micro n’est pas autorisé. Ce n’est pas grave : touche « Jouer sans micro » et faites les voix vous-mêmes.'}
        {recorder.state === 'idle' &&
          clip.failed &&
          'Le son ne s’est pas lancé. Réessaie, ou réenregistre.'}
      </p>
    </div>
  );
}

/** Défi « Devine la voix », avec le micro : la phrase est connue, la voix est une surprise. */
function GuessVoice({ item }: { item: PackItem }) {
  const clip = useVoiceClip();
  const [surprise] = useState(surpriseEffect);
  const [revealed, setRevealed] = useState(false);
  const info = effectInfo(surprise);
  return (
    <>
      <PhraseCard item={item} label={CHALLENGE_NAME.voix} read />
      <RecordControls clip={clip} />
      {clip.audio && clip.recorder.state !== 'recording' && (
        <>
          <Button
            variant="secondary"
            block
            icon={clip.playing ? <IconStop size={18} /> : <IconPlay size={18} />}
            onClick={() => (clip.playing ? clip.stop() : clip.play(surprise))}
          >
            {clip.playing ? 'Arrêter' : 'Écouter la voix surprise'}
          </Button>
          {revealed && (
            <EffectButtons
              playing={clip.playing}
              onPlay={clip.play}
              label="Réécouter avec une autre voix"
            />
          )}
        </>
      )}
      <ParentBlock
        hidden={
          <p>
            <span aria-hidden="true">{info.emoji}</span> La voix de {info.name.toLowerCase()} !
          </p>
        }
        revealLabel="Voir la voix"
        onReveal={() => setRevealed(true)}
      >
        <p>
          Lis la phrase à l’enfant, il l’enregistre. Écoutez la voix surprise : robot, souris, géant
          ou écho ?
        </p>
        <p className="muted">{KEPT_NOTE}</p>
      </ParentBlock>
    </>
  );
}

/** Défi « Devine ma phrase », avec le micro : l'enfant choisit la voix, le parent devine. */
function GuessPhrase({ item }: { item: PackItem }) {
  const clip = useVoiceClip();
  const recorded = !!clip.audio && clip.recorder.state !== 'recording';
  return (
    <>
      {recorded ? (
        <section className="deck-card deck-card--image voix-hidden" aria-label="Phrase">
          <span className="deck-card__emoji" aria-hidden="true">
            🤫
          </span>
          <p className="deck-card__text">La phrase est cachée</p>
        </section>
      ) : (
        <PhraseCard item={item} label={`${CHALLENGE_NAME.phrase} · le parent ne regarde pas`} />
      )}
      <RecordControls clip={clip} />
      {recorded && (
        <EffectButtons playing={clip.playing} onPlay={clip.play} label="Choisis une voix" />
      )}
      <ParentBlock hidden={<p>« {item.answer} »</p>}>
        <p>
          Bouche-toi les oreilles pendant que l’enfant dit la phrase (ou une phrase à lui), puis
          devine-la en l’écoutant avec la voix qu’il choisit.
        </p>
        <p className="muted">{KEPT_NOTE}</p>
      </ParentBlock>
    </>
  );
}

/** Sans micro : on fait les voix soi-même, chacun son tour. */
function WithoutMic({
  item,
  challenge,
  canUseMic,
  onMic,
}: {
  item: PackItem;
  challenge: Challenge;
  canUseMic: boolean;
  onMic: () => void;
}) {
  const [surprise] = useState(surpriseEffect);
  const [picked, setPicked] = useState<VoiceEffect | null>(null);
  const info = effectInfo(surprise);
  return (
    <>
      <PhraseCard item={item} label="Le parent lit à voix haute" read />
      {challenge === 'voix' ? (
        <ParentBlock
          hidden={
            <p>
              <span aria-hidden="true">{info.emoji}</span> {info.name} : {info.how}.
            </p>
          }
          revealLabel="Voir la voix à imiter"
        >
          <p>Sans micro : dis la phrase avec la voix cachée, l’enfant devine laquelle.</p>
        </ParentBlock>
      ) : (
        <>
          <EffectButtons
            playing={picked}
            onPlay={(e) => setPicked(e)}
            label="Choisis une voix à imiter"
          />
          <ParentBlock>
            <p>
              Sans micro : l’enfant choisit une voix sans te la montrer et dit la phrase avec. À toi
              de deviner la voix !
            </p>
          </ParentBlock>
        </>
      )}
      {canUseMic && (
        <button type="button" className="link-btn" onClick={onMic}>
          Jouer avec le micro
        </button>
      )}
    </>
  );
}

function PhraseCard({ item, label, read }: { item: PackItem; label: string; read?: boolean }) {
  return (
    <section className="deck-card deck-card--question voix-card" aria-label="Phrase">
      <span className="word-card__label">{label}</span>
      {item.emoji && (
        <span className="voix-card__emoji" aria-hidden="true">
          {item.emoji}
        </span>
      )}
      <p className="deck-card__question">{item.answer}</p>
      {read && <ReadAloud text={item.answer} />}
    </section>
  );
}

function VoixRound({
  item,
  challenge,
  withMic,
  onMic,
}: {
  item: PackItem;
  challenge: Challenge;
  withMic: boolean;
  onMic: (on: boolean) => void;
}) {
  const mic = canRecord();
  return (
    <div className="deck-round round-in">
      {mic && withMic ? (
        challenge === 'voix' ? (
          <GuessVoice item={item} />
        ) : (
          <GuessPhrase item={item} />
        )
      ) : (
        <WithoutMic item={item} challenge={challenge} canUseMic={mic} onMic={() => onMic(true)} />
      )}
      {mic && withMic && (
        <button type="button" className="link-btn" onClick={() => onMic(false)}>
          Jouer sans micro
        </button>
      )}
    </div>
  );
}

function VoixSession({ onReplay }: { onReplay: () => void }) {
  const setting = useRoundSetting();
  const turns = useTurns(VOIX_ID);
  const [withMic, setWithMic] = useState(true);
  const items = useSavedDraw(
    VOIX_ID,
    'draw',
    PHRASES,
    () =>
      turns
        ? drawForTurns(PHRASES, turns.levels(Math.min(setting, PHRASES.length)), cardLevel)
        : drawForLevel(PHRASES, setting, getSettings().gameLevel, cardLevel),
    phraseKey,
  );
  const { round, rounds, stars, finished, answer, team, teams } = useRounds(
    VOIX_ID,
    items.length,
    turns?.order,
  );

  if (finished)
    return <GameResult stars={stars} rounds={rounds} teams={teams} onReplay={onReplay} />;

  return (
    <main className="screen">
      <GameHeader
        round={round}
        rounds={rounds}
        stars={stars}
        category={VOIX_CATEGORY}
        title={VOIX_NAME}
        player={turns?.playerAt(round)}
        team={team}
      />
      {/* key : nouvelle manche = enregistrement oublié, voix arrêtée, nouvelle phrase. */}
      <TurnPlayer.Provider value={turns?.playerAt(round)}>
        <VoixRound
          key={round}
          item={items[round - 1]}
          challenge={challengeAt(round)}
          withMic={withMic}
          onMic={setWithMic}
        />
      </TurnPlayer.Provider>
      <div className="spacer" />
      <AnswerBar onSkip={() => answer(false)} onFound={() => answer(true)} skipLabel="Pas encore" />
    </main>
  );
}

export function VoixGame() {
  return <Replayable>{(replay) => <VoixSession onReplay={replay} />}</Replayable>;
}
