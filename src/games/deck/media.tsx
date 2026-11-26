import { useEffect, useState } from 'react';
import { useRecording } from '../../audio/recording';
import { IconPause, IconPlay } from '../../components/icons';
import type { DeckItem } from './types';
import './media.css';

/**
 * Vrais cris et photos des jeux intégrés (#118). Les fichiers sont embarqués dans l'appli et
 * mis en cache par le service worker : ils sont lus hors ligne, rien ne part du téléphone.
 */

const blobs = new Map<string, Promise<Blob | null>>();

/** Lit un fichier embarqué une fois pour toutes ; un échec n'est pas retenu. */
function loadBlob(url: string): Promise<Blob | null> {
  let p = blobs.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null)
      .then((blob) => {
        if (!blob) blobs.delete(url);
        return blob;
      });
    blobs.set(url, p);
  }
  return p;
}

/** Le fichier d'une adresse, chargé à l'affichage (avant l'appui, qui doit lancer le son). */
function useMediaBlob(url: string | undefined): Blob | undefined {
  const [loaded, setLoaded] = useState<{ url: string; blob: Blob }>();
  useEffect(() => {
    if (!url) return;
    let live = true;
    void loadBlob(url).then((blob) => {
      if (live && blob) setLoaded({ url, blob });
    });
    return () => {
      live = false;
    };
  }, [url]);
  return loaded && loaded.url === url ? loaded.blob : undefined;
}

/**
 * Bouton « Écouter le cri » : joue le vrai enregistrement, au niveau commun de l'appli.
 * Coupé quand la carte disparaît (manche suivante, sortie du jeu).
 */
export function RealSound({ url }: { url: string }) {
  const audio = useMediaBlob(url);
  const { playing, failed, toggle } = useRecording(audio);
  return (
    <div className="real-sound">
      <button
        type="button"
        className="btn btn--secondary real-sound__button"
        onClick={toggle}
        disabled={!audio}
        aria-pressed={playing}
      >
        {playing ? <IconPause size={20} /> : <IconPlay size={20} />}
        {playing ? 'Arrêter le cri' : 'Écouter le cri'}
      </button>
      {failed && (
        <span role="status" className="muted">
          Le cri ne s’est pas lancé. Touche encore le bouton, ou fais le bruit toi-même.
        </span>
      )}
    </div>
  );
}

/** Photo de la réponse : jamais avant « Voir la réponse » ou « Trouvé » (elle la donnerait). */
export function AnswerPhoto({ item }: { item: DeckItem }) {
  if (!item.photoUrl) return null;
  return (
    <img
      className="answer-photo"
      src={item.photoUrl}
      alt={`Photo : ${item.answer.toLowerCase()}`}
      decoding="async"
    />
  );
}
