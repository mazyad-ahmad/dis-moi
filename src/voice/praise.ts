import { playClip } from '../audio/clip';
import { audioBusy, sourcePlaying } from '../audio/context';
import { listPraises } from '../data/praises';
import { getSettings } from '../data/settings';
import { speak, type Speaking } from './speech';

/**
 * Félicitations parlées (#116) : « Bravo ! » au « Trouvé », une phrase de fête en fin de partie.
 * Dites par la voix française locale du téléphone (`speech.ts`), ou remplacées par les
 * félicitations que le parent a enregistrées. Jamais rien sur « Pas encore / Passer ».
 *
 * Elles ne retardent rien : elles partent après le son d'interface, pendant que la manche
 * suivante est déjà là, et s'effacent devant une mélodie, un son ou une lecture.
 */

/** Ton unique tant que les niveaux par âge (#40) n'existent pas. */
export const PRAISES = ['Bravo !', 'Super !', 'Bien joué !', 'Génial !', 'Trop fort !'] as const;

/** Phrase de fin de partie : toujours une fête, même sans étoile. */
export function endPhrase(stars: number): string {
  if (stars > 1) return `Vous avez gagné ${stars} étoiles ensemble !`;
  if (stars === 1) return 'Vous avez gagné une étoile ensemble !';
  return 'Bravo d’avoir joué ensemble !';
}

/** Tire un élément au hasard, en évitant de redire le précédent. */
export function pickOther<T>(list: readonly T[], last: T | undefined, random = Math.random): T {
  const pool = list.length > 1 ? list.filter((x) => x !== last) : list;
  return pool[Math.floor(random() * pool.length)];
}

/** Toutes les 150 ms, on vérifie qu'aucun autre son n'a démarré. */
const WATCH_MS = 150;

let timer: number | undefined;
let current: { stop: () => void } | null = null;
let lastText: string | undefined;
let lastClip: number | undefined;
/** Chaque demande annule la précédente : une réponse tardive de la base est ignorée. */
let ticket = 0;

/** Annule la félicitation prévue et coupe celle en cours. */
export function cancelPraise(): void {
  ticket++;
  window.clearTimeout(timer);
  timer = undefined;
  current?.stop();
  current = null;
}

/** Arrête la félicitation dès qu'un autre son démarre (mélodie, son de carte, lecture). */
function watch(stop: () => void, othersPlaying: () => boolean) {
  const id = window.setInterval(() => {
    if (othersPlaying()) stop();
  }, WATCH_MS);
  return () => window.clearInterval(id);
}

async function say(text: string, mine: number) {
  const praises = await listPraises().catch(() => []);
  if (mine !== ticket || audioBusy()) return;

  // Les félicitations du parent remplacent la voix du téléphone.
  if (praises.length) {
    const praise = pickOther(
      praises,
      praises.find((p) => p.id === lastClip),
    );
    lastClip = praise.id;
    const clip = await playClip(praise.audio);
    if (!clip) return;
    if (mine !== ticket) return clip.stop();
    const unwatch = watch(clip.stop, () => audioBusy(clip.playing));
    current = clip;
    void clip.done.then(() => {
      unwatch();
      if (current === clip) current = null;
    });
    return;
  }

  let unwatch = () => {};
  const speaking: Speaking | null = speak(text, {
    onEnd: () => {
      unwatch();
      if (current === speaking) current = null;
    },
  });
  if (!speaking) return;
  current = speaking;
  // La voix elle-même compte comme « lecture en cours » : on ne surveille que les autres sons.
  unwatch = watch(speaking.stop, () => sourcePlaying());
}

/**
 * Prévoit une félicitation : au « Trouvé » (`stars` absent) ou en fin de partie.
 * `afterMs` : durée du son d'interface joué au même moment, que la voix ne couvre pas.
 * Sans effet si le parent a coupé le réglage.
 */
export function praise({ stars, afterMs = 0 }: { stars?: number; afterMs?: number } = {}): void {
  cancelPraise();
  if (!getSettings().praise) return;
  const text = stars === undefined ? pickOther(PRAISES, lastText) : endPhrase(stars);
  if (stars === undefined) lastText = text;
  const mine = ticket;
  timer = window.setTimeout(() => {
    timer = undefined;
    void say(text, mine);
  }, afterMs);
}
