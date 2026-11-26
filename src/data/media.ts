import { releaseAudioContext } from '../audio/context';
import { useEffect, useRef, useState } from 'react';

/** Côté le plus long d'une photo gardée dans la base. */
export const MAX_PHOTO_SIZE = 1280;
/** Poids maximal d'une photo gardée telle quelle, quand le téléphone ne sait pas la réduire. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** Durée maximale d'un enregistrement, en secondes. */
export const MAX_RECORD_SECONDS = 10;

/** Échec de préparation d'une photo, avec un message à montrer au parent. */
export class PhotoError extends Error {}

const NOT_A_PHOTO = 'Ce fichier n’est pas une photo. Choisis une photo.';
const UNREADABLE =
  'Cette photo ne peut pas être lue sur ce téléphone. Essaie une autre photo (JPEG ou PNG).';
const TOO_HEAVY = 'Cette photo est trop lourde pour ce téléphone. Essaie une autre photo.';

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

/** Décode une image : createImageBitmap, sinon un élément <img> (anciens Chrome, gros fichiers). */
async function decode(file: Blob): Promise<Decoded | undefined> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // On essaie avec <img>.
    }
  }
  if (typeof URL.createObjectURL !== 'function') return undefined;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) return undefined;
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return undefined;
  }
}

/** Redessine l'image réduite en JPEG ; `null` si le téléphone n'y arrive pas (mémoire). */
async function reencode(image: Decoded): Promise<Blob | null> {
  const scale = Math.min(1, MAX_PHOTO_SIZE / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#fff'; // fond blanc : le JPEG n'a pas de transparence
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image.source, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85));
}

/**
 * Prépare une photo choisie sur l'appareil (souvent plusieurs Mo) avant de la garder dans
 * IndexedDB : réduite à MAX_PHOTO_SIZE et recopiée en mémoire. Un fichier du sélecteur Android
 * reste lié à son original (galerie, appareil photo) et peut ne plus se lire au moment de
 * l'écrire : on ne le garde jamais tel quel. Lève une PhotoError au message clair.
 */
export async function preparePhoto(file: Blob): Promise<Blob> {
  if (file.type && !file.type.startsWith('image/')) throw new PhotoError(NOT_A_PHOTO);
  if (!file.size) throw new PhotoError(UNREADABLE);
  const image = await decode(file);
  if (!image) throw new PhotoError(UNREADABLE);
  const out = await reencode(image)
    .catch(() => null) // mémoire insuffisante pour le canvas
    .finally(() => image.close());
  if (out && out.size > 0) return out;
  // Réduction impossible : copie en mémoire de l'original, s'il n'est pas trop lourd.
  if (file.size > MAX_PHOTO_BYTES) throw new PhotoError(TOO_HEAVY);
  try {
    return new Blob([await file.arrayBuffer()], { type: file.type || 'image/jpeg' });
  } catch {
    throw new PhotoError(UNREADABLE);
  }
}

export function canRecord(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Formats d'enregistrement, du préféré au moins bien lu (#141) : Opus en WebM (Chrome, Android),
 * puis MP4/AAC (Safari) que tous les téléphones savent relire. Sinon, le choix du navigateur.
 */
const RECORD_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export function recordType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function')
    return undefined;
  return RECORD_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

/** Type du Blob enregistré : celui du MediaRecorder, sinon celui des morceaux, sinon WebM. */
export function recordedBlob(chunks: Blob[], mimeType: string | undefined): Blob {
  const parts = chunks.filter((c) => c.size > 0);
  const type = mimeType || parts.find((c) => c.type)?.type || 'audio/webm';
  return new Blob(parts, { type });
}

export type RecorderState = 'idle' | 'recording' | 'denied';

/** Enregistrement au micro, arrêté automatiquement après `maxSeconds` (MAX_RECORD_SECONDS). */
export function useRecorder(onDone: (audio: Blob) => void, maxSeconds = MAX_RECORD_SECONDS) {
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
    const type = recordType();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    } catch {
      rec = new MediaRecorder(stream);
    }
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      // Le son repart d'un contexte neuf, hors du mode « appel » pris pendant le micro.
      releaseAudioContext();
      recorder.current = null;
      setState('idle');
      const audio = recordedBlob(chunks, rec.mimeType);
      if (audio.size) done.current(audio);
    };
    rec.start();
    recorder.current = rec;
    setState('recording');
    window.setTimeout(() => {
      if (rec.state === 'recording') rec.stop();
    }, maxSeconds * 1000);
  }

  function stop() {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }

  return { state, start, stop };
}
