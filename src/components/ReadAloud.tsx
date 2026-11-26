import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../data/settings';
import { speak, useFrenchVoice, type Speaking } from '../voice/speech';
import { IconPause, IconSpeaker } from './icons';

/**
 * Bouton « Lire » (#35) : lit une question, un mot ou une consigne avec la voix du téléphone.
 * Absent sans voix française locale, ou si le parent l'a désactivé.
 * La lecture s'arrête quand le texte change (nouvelle manche, autre mot) ou quand le bouton
 * disparaît (fin de partie, sortie du jeu).
 */
export function ReadAloud({ text }: { text: string }) {
  const voice = useFrenchVoice();
  const { readAloud } = useSettings();
  const [speaking, setSpeaking] = useState(false);
  const reading = useRef<Speaking | null>(null);

  useEffect(
    () => () => {
      reading.current?.stop();
      reading.current = null;
    },
    [text],
  );

  if (!voice || readAloud === 'off' || !text.trim()) return null;

  const toggle = () => {
    if (reading.current) {
      reading.current.stop();
      return;
    }
    const r = speak(text, {
      speed: readAloud,
      onEnd: () => {
        if (reading.current === r) reading.current = null;
        setSpeaking(false);
      },
    });
    reading.current = r;
    setSpeaking(!!r);
  };

  return (
    <button
      type="button"
      className="read-aloud"
      onClick={toggle}
      aria-label={speaking ? 'Arrêter la lecture' : 'Lire'}
    >
      {speaking ? <IconPause size={18} /> : <IconSpeaker size={20} />}
      {speaking ? 'Arrêter' : 'Lire'}
    </button>
  );
}
