/**
 * Un seul `AudioContext` pour toute l'appli (mélodies, sons d'interface…).
 * Tout le son passe par une sortie commune (`audioOutput()`), point unique pour régler le volume.
 */

type AudioCtor = typeof AudioContext;

function audioContextClass(): AudioCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext;
}

export function audioAvailable(): boolean {
  return audioContextClass() !== undefined;
}

let ctx: AudioContext | null = null;
let output: GainNode | null = null;
let listening = false;

/** Après verrouillage puis réveil du téléphone, le navigateur a pu suspendre le son. */
function onVisible() {
  if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running')
    void ctx.resume().catch(() => {});
}

/** Le contexte partagé, créé au premier besoin ; `null` si l'appareil n'a pas de Web Audio. */
export function audioContext(): AudioContext | null {
  if (ctx && ctx.state !== 'closed') return ctx;
  const Ctor = audioContextClass();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  output = ctx.createGain();
  output.connect(ctx.destination);
  if (!listening) {
    document.addEventListener('visibilitychange', onVisible);
    listening = true;
  }
  return ctx;
}

/** Nœud de sortie commun : chaque son s'y branche plutôt que sur `destination`. */
export function audioOutput(): GainNode | null {
  return audioContext() ? output : null;
}

/**
 * Contexte prêt à jouer : relancé s'il a été suspendu (veille, autre appli, iOS « interrupted »).
 * À appeler de préférence pendant un geste (appui), que le navigateur exige pour démarrer le son.
 */
export async function runningAudioContext(): Promise<AudioContext | null> {
  const c = audioContext();
  if (!c) return null;
  if (c.state !== 'running') await c.resume();
  return c;
}

/** Sources qui jouent un son « important » (mélodie, son enregistré) : rien ne doit les couvrir. */
const sources = new Set<() => boolean>();

/** Déclare une source de son ; renvoie de quoi la retirer. */
export function registerAudioSource(isPlaying: () => boolean): () => void {
  sources.add(isPlaying);
  return () => {
    sources.delete(isPlaying);
  };
}

/** Une source déclarée (mélodie, son enregistré), autre que `except`, joue-t-elle ? */
export function sourcePlaying(except?: () => boolean): boolean {
  for (const playing of sources) if (playing !== except && playing()) return true;
  return false;
}

/** Une mélodie, un son enregistré ou une lecture à voix haute (autre que `except`) est-il en cours ? */
export function audioBusy(except?: () => boolean): boolean {
  if (sourcePlaying(except)) return true;
  return typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking;
}

/** Pour les tests : oublie le contexte et les sources. */
export function resetAudioForTests(): void {
  ctx = null;
  output = null;
  sources.clear();
  if (listening) document.removeEventListener('visibilitychange', onVisible);
  listening = false;
}
