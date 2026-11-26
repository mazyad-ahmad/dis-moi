import { audioOutput, registerAudioSource, runningAudioContext } from './context';

/** Son enregistré en cours de lecture. */
export interface Clip {
  /** Arrête la lecture (sans effet si elle est finie). */
  stop: () => void;
  /** Vrai tant que le son joue ; c'est aussi la source déclarée au contexte audio. */
  playing: () => boolean;
  /** Résolue à la fin de la lecture, naturelle ou non. */
  done: Promise<void>;
}

/**
 * Joue un son enregistré au micro (félicitations du parent, #116) par le contexte audio partagé :
 * il passe par la sortie commune (`audioOutput()`), point unique pour régler son volume.
 * Déclaré comme source pendant la lecture : aucun son d'interface ne le couvre.
 * Renvoie null si l'appareil ne sait pas le jouer. Ne lève jamais d'erreur.
 */
export async function playClip(audio: Blob): Promise<Clip | null> {
  try {
    const ctx = await runningAudioContext();
    const out = audioOutput();
    if (!ctx || !out) return null;
    const buffer = await ctx.decodeAudioData(await audio.arrayBuffer());
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(out);
    let live = true;
    const playing = () => live;
    const release = registerAudioSource(playing);
    const done = new Promise<void>((resolve) => {
      source.onended = () => {
        live = false;
        release();
        resolve();
      };
    });
    source.start();
    return {
      playing,
      done,
      stop: () => {
        if (!live) return;
        try {
          source.stop();
        } catch {
          // Déjà arrêté : onended suit.
        }
      },
    };
  } catch {
    return null;
  }
}
