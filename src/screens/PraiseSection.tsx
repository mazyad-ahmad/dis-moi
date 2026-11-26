import { useEffect, useRef, useState } from 'react';
import { playClip, type Clip } from '../audio/clip';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { IconMic, IconPause, IconPlay, IconStop, IconTrash } from '../components/icons';
import { useConfirm } from '../components/useConfirm';
import type { Praise } from '../data/db';
import { canRecord, MAX_RECORD_SECONDS, useRecorder } from '../data/media';
import { addPraise, deletePraise, MAX_PRAISES, usePraises } from '../data/praises';
import { setSetting, useSettings } from '../data/settings';
import { useFrenchVoice } from '../voice/speech';

const PRAISE_CHOICES = [
  { value: 'on', label: 'Activées' },
  { value: 'off', label: 'Désactivées' },
] as const;

/** Une félicitation enregistrée : l'écouter ou la supprimer. */
function PraiseRow({ praise, index }: { praise: Praise; index: number }) {
  const [confirmDialog, confirm] = useConfirm();
  const [playing, setPlaying] = useState(false);
  const clip = useRef<Clip | null>(null);
  useEffect(() => () => clip.current?.stop(), []);
  const label = `Félicitation ${index + 1}`;

  async function toggle() {
    if (clip.current) return clip.current.stop();
    const c = await playClip(praise.audio);
    if (!c) return;
    clip.current = c;
    setPlaying(true);
    await c.done;
    clip.current = null;
    setPlaying(false);
  }

  return (
    <li>
      <Card className="item-row">
        <IconMic aria-hidden="true" />
        <span className="item-row__text">
          <strong>{label}</strong>
        </span>
        <button
          type="button"
          className="icon-btn icon-btn--plain"
          aria-label={playing ? `Arrêter ${label}` : `Écouter ${label}`}
          onClick={() => void toggle()}
        >
          {playing ? <IconPause size={20} /> : <IconPlay size={20} />}
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--plain"
          aria-label={`Supprimer ${label}`}
          onClick={async () => {
            const ok = await confirm({
              title: `Supprimer la ${label.toLowerCase()} ?`,
              confirmLabel: 'Supprimer',
              danger: true,
            });
            if (ok) await deletePraise(praise.id);
          }}
        >
          <IconTrash size={20} />
        </button>
      </Card>
      {confirmDialog}
    </li>
  );
}

/** Enregistrer une félicitation au micro (10 s maximum), gardée sur le téléphone. */
function PraiseRecorder({ count }: { count: number }) {
  const { state, start, stop } = useRecorder((audio) => void addPraise(audio));
  if (count >= MAX_PRAISES && state !== 'recording')
    return <p className="muted">{MAX_PRAISES} félicitations au maximum.</p>;
  return (
    <div className="media-row">
      {state === 'recording' ? (
        <Button variant="danger" icon={<IconStop size={18} />} onClick={stop}>
          Arrêter
        </Button>
      ) : (
        <Button variant="secondary" icon={<IconMic size={20} />} onClick={() => void start()}>
          Enregistrer une félicitation
        </Button>
      )}
      <span className="muted" role="status">
        {state === 'recording' && `Enregistrement… (${MAX_RECORD_SECONDS} s maximum)`}
        {state === 'denied' && 'Autorise le micro pour enregistrer une félicitation.'}
      </span>
    </div>
  );
}

/**
 * Félicitations parlées (#116) dans l'espace Parent : réglage, et félicitations enregistrées
 * par le parent, qui remplacent la voix du téléphone. Sans voix française locale ni
 * enregistrement, la fonction n'est pas proposée (seul l'enregistrement l'est, s'il est possible).
 */
export function PraiseSection() {
  const { praise } = useSettings();
  const voice = useFrenchVoice();
  const praises = usePraises();
  const mic = canRecord();
  if (!praises) return null;
  const available = !!voice || praises.length > 0;

  return (
    <fieldset className="setting">
      <legend className="eyebrow">Félicitations parlées</legend>
      {available ? (
        <>
          <div className="segmented segmented--2">
            {PRAISE_CHOICES.map((o) => (
              <label key={o.value}>
                <input
                  type="radio"
                  name="praise"
                  value={o.value}
                  checked={(praise ? 'on' : 'off') === o.value}
                  onChange={() => void setSetting('praise', o.value === 'on')}
                />
                {o.label}
              </label>
            ))}
          </div>
          <p className="muted">
            « Bravo ! » quand on trouve, et une phrase de fête en fin de partie, sans réseau.
            {mic &&
              ' Vos propres félicitations, enregistrées ici, remplacent la voix du téléphone.'}
          </p>
        </>
      ) : (
        <p className="muted">
          {mic
            ? 'Pas de voix française sur ce téléphone : enregistrez vos propres félicitations pour les entendre quand on trouve.'
            : 'Pas de voix française sur ce téléphone ni de micro : les félicitations parlées ne sont pas proposées.'}
        </p>
      )}
      {praises.length > 0 && (
        <ul className="catalogue__list" aria-label="Félicitations enregistrées">
          {praises.map((p, i) => (
            <PraiseRow key={p.id} praise={p} index={i} />
          ))}
        </ul>
      )}
      {mic && <PraiseRecorder count={praises.length} />}
    </fieldset>
  );
}
