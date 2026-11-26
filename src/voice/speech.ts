import { useSyncExternalStore } from 'react';

/**
 * Lecture à voix haute (#35) par la synthèse vocale du téléphone (`speechSynthesis`).
 *
 * Seule une voix française **installée sur l'appareil** (`localService`) est retenue :
 * une voix en ligne enverrait le texte à un serveur. Sans elle, la fonction n'est pas proposée.
 * Module partagé : boutons « Lire » des jeux, félicitations parlées (#116).
 */

export type SpeechSpeed = 'normal' | 'slow';

/** Débit de la synthèse pour chaque vitesse. */
export const SPEECH_RATES: Record<SpeechSpeed, number> = { normal: 1, slow: 0.7 };

function synth(): SpeechSynthesis | undefined {
  return typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
    ? window.speechSynthesis
    : undefined;
}

/** Voix française locale à utiliser parmi celles du téléphone, sinon null. */
export function pickFrenchVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const fr = voices.filter((v) => v.localService && /^fr([-_]|$)/i.test(v.lang));
  const france = fr.filter((v) => /^fr[-_]fr$/i.test(v.lang));
  return france.find((v) => v.default) ?? france[0] ?? fr.find((v) => v.default) ?? fr[0] ?? null;
}

// Les voix arrivent souvent après le chargement (évènement « voiceschanged ») : on garde le choix
// en mémoire et on le recalcule à chaque changement.
let voice: SpeechSynthesisVoice | null | undefined;
const listeners = new Set<() => void>();

function refresh() {
  const next = pickFrenchVoice(synth()?.getVoices() ?? []);
  if (next === voice) return;
  voice = next;
  listeners.forEach((l) => l());
}

/** Voix française locale du téléphone, ou null (pas de synthèse, ou voix seulement en ligne). */
export function getFrenchVoice(): SpeechSynthesisVoice | null {
  // Tant qu'aucune voix n'est retenue, on regarde de nouveau (voix chargées entre-temps).
  if (!voice) voice = pickFrenchVoice(synth()?.getVoices() ?? []);
  return voice;
}

function subscribe(cb: () => void) {
  const s = synth();
  listeners.add(cb);
  if (listeners.size === 1) s?.addEventListener?.('voiceschanged', refresh);
  return () => {
    listeners.delete(cb);
    if (!listeners.size) s?.removeEventListener?.('voiceschanged', refresh);
  };
}

/** Voix française locale, mise à jour quand le téléphone charge ses voix. */
export function useFrenchVoice(): SpeechSynthesisVoice | null {
  return useSyncExternalStore(subscribe, getFrenchVoice, () => null);
}

/** Lecture en cours : un seul texte à la fois. */
let current: SpeechSynthesisUtterance | null = null;

export interface Speaking {
  /** Arrête cette lecture (sans effet si une autre a pris sa place). */
  stop: () => void;
}

/**
 * Lit un texte avec la voix française locale. Arrête la lecture précédente.
 * Renvoie null si aucune voix locale n'est disponible : rien n'est lu.
 */
export function speak(
  text: string,
  { speed = 'normal', onEnd }: { speed?: SpeechSpeed; onEnd?: () => void } = {},
): Speaking | null {
  const s = synth();
  const v = getFrenchVoice();
  if (!s || !v) return null;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  // Voix imposée : jamais de repli silencieux vers une voix en ligne.
  u.voice = v;
  u.lang = v.lang;
  u.rate = SPEECH_RATES[speed];
  const done = () => {
    if (current !== u) return;
    current = null;
    onEnd?.();
  };
  u.onend = done;
  u.onerror = done;
  current = u;
  s.speak(u);
  return {
    stop: () => {
      if (current !== u) return;
      current = null;
      s.cancel();
      onEnd?.();
    },
  };
}

/** Arrête toute lecture en cours. */
export function stopSpeaking(): void {
  current = null;
  synth()?.cancel();
}

/** Pour les tests : oublie la voix retenue. */
export function resetVoiceForTests(): void {
  voice = undefined;
  current = null;
}
