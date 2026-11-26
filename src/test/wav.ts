/**
 * Lecture et écriture de fichiers WAV (PCM 8, 16, 24, 32 bits ou flottant 32 bits),
 * pour contrôler le niveau des fichiers audio dans les tests (#121).
 */

export interface Pcm {
  channels: Float32Array[];
  sampleRate: number;
}

const tag = (view: DataView, at: number) =>
  String.fromCharCode(...[0, 1, 2, 3].map((i) => view.getUint8(at + i)));

function sampleReader(data: DataView, format: number, bits: number) {
  if (format === 3 && bits === 32) return (at: number) => data.getFloat32(at, true);
  if (format !== 1) return null;
  switch (bits) {
    case 8:
      return (at: number) => (data.getUint8(at) - 128) / 128;
    case 16:
      return (at: number) => data.getInt16(at, true) / 0x8000;
    case 24:
      return (at: number) =>
        (data.getUint8(at) | (data.getUint8(at + 1) << 8) | (data.getInt8(at + 2) << 16)) /
        0x800000;
    case 32:
      return (at: number) => data.getInt32(at, true) / 0x80000000;
    default:
      return null;
  }
}

/** Décode un WAV ; lève une erreur pour tout autre format. */
export function parseWav(bytes: Uint8Array): Pcm {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 12 || tag(view, 0) !== 'RIFF' || tag(view, 8) !== 'WAVE')
    throw new Error('pas un fichier WAV');
  let format = 0;
  let count = 0;
  let sampleRate = 0;
  let bits = 0;
  let data: DataView | null = null;
  for (let at = 12; at + 8 <= bytes.byteLength;) {
    const id = tag(view, at);
    const size = view.getUint32(at + 4, true);
    const body = at + 8;
    if (id === 'fmt ') {
      format = view.getUint16(body, true);
      count = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
      // WAVE_FORMAT_EXTENSIBLE : le vrai format est au début du sous-format.
      if (format === 0xfffe) format = view.getUint16(body + 24, true);
    } else if (id === 'data') {
      data = new DataView(
        bytes.buffer,
        bytes.byteOffset + body,
        Math.min(size, bytes.byteLength - body),
      );
    }
    at = body + size + (size % 2);
  }
  if (!data || !count || !sampleRate) throw new Error('WAV incomplet');
  const width = bits / 8;
  const read = sampleReader(data, format, bits);
  if (!read) throw new Error(`WAV non pris en charge (format ${format}, ${bits} bits)`);
  const frames = Math.floor(data.byteLength / (width * count));
  const channels = Array.from({ length: count }, () => new Float32Array(frames));
  for (let f = 0; f < frames; f++)
    for (let c = 0; c < count; c++) channels[c][f] = read((f * count + c) * width);
  return { channels, sampleRate };
}

/** Écrit un WAV PCM 16 bits mono (fichiers de test). */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const out = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(out.buffer);
  const write = (at: number, s: string) =>
    [...s].forEach((ch, i) => view.setUint8(at + i, ch.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((v, i) =>
    view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, v)) * 0x7fff), true),
  );
  return out;
}
