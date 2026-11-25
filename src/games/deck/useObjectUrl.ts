import { useEffect } from 'react';

/** Une URL par Blob, partagée entre composants et libérée quand plus personne ne l'affiche. */
const urls = new WeakMap<Blob, { url: string; users: number }>();

function entry(blob: Blob) {
  let e = urls.get(blob);
  if (!e) {
    e = { url: URL.createObjectURL(blob), users: 0 };
    urls.set(blob, e);
  }
  return e;
}

const supported = () => typeof URL.createObjectURL === 'function';

/** URL temporaire pour afficher ou lire un Blob (photo, son enregistré). */
export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const url = blob && supported() ? entry(blob).url : undefined;
  useEffect(() => {
    if (!blob || !supported()) return;
    const e = entry(blob);
    e.users++;
    return () => {
      e.users--;
      // Délai : un remontage immédiat (StrictMode, changement de clé) reprend la même URL.
      window.setTimeout(() => {
        if (e.users > 0 || urls.get(blob) !== e) return;
        URL.revokeObjectURL(e.url);
        urls.delete(blob);
      }, 1000);
    };
  }, [blob]);
  return url;
}
