import { useEffect, useRef, useState } from 'react';

/** Côté le plus long d'une photo gardée dans la base. */
export const MAX_PHOTO_SIZE = 1280;
/** Durée maximale d'un enregistrement, en secondes. */
export const MAX_RECORD_SECONDS = 10;

/**
 * Réduit une photo de l'appareil (souvent plusieurs Mo) avant de la garder dans IndexedDB.
 * Si le navigateur ne sait pas la décoder, on garde le fichier tel quel.
 */
export async function shrinkImage(file: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_PHOTO_SIZE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const out = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85));
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}

export function canRecord(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export type RecorderState = 'idle' | 'recording' | 'denied';

/** Enregistrement au micro, arrêté automatiquement après MAX_RECORD_SECONDS. */
export function useRecorder(onDone: (audio: Blob) => void) {
  const [state, setState] = useState<RecorderState>('idle');
  const recorder = useRef<MediaRecorder | null>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  // On coupe le micro si l'écran est quitté pendant l'enregistrement.
  useEffect(() => () => recorder.current?.stream.getTracks().forEach((t) => t.stop()), []);

  async function start() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState('denied');
      return;
    }
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      recorder.current = null;
      setState('idle');
      if (chunks.length) done.current(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
    };
    rec.start();
    recorder.current = rec;
    setState('recording');
    window.setTimeout(() => {
      if (rec.state === 'recording') rec.stop();
    }, MAX_RECORD_SECONDS * 1000);
  }

  function stop() {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }

  return { state, start, stop };
}
