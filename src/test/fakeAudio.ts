/** Web Audio minimal pour les tests : retient les nœuds créés et leurs branchements. */

export class FakeParam {
  value = 0;
  /** Valeurs programmées, dans l'ordre : [valeur, temps]. */
  ramps: [number, number][] = [];
  setValueAtTime(v: number, t: number) {
    this.ramps.push([v, t]);
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.ramps.push([v, t]);
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.ramps.push([v, t]);
  }
  cancelScheduledValues() {}
}

export class FakeNode {
  connected = true;
  outputs: FakeNode[] = [];
  connect(n: FakeNode) {
    this.outputs.push(n);
    return n;
  }
  disconnect() {
    this.connected = false;
  }
}

export class FakeOsc extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  start() {}
  stop() {}
}

export class FakeGain extends FakeNode {
  gain = new FakeParam();
}

export class FakeShaper extends FakeNode {
  curve: Float32Array | null = null;
}

/** Son décodé : un tableau d'échantillons par canal. */
export class FakeBuffer {
  constructor(
    readonly channels: Float32Array[],
    readonly sampleRate = 8000,
  ) {}
  get numberOfChannels() {
    return this.channels.length;
  }
  getChannelData(i: number) {
    return this.channels[i];
  }
}

export class FakeBufferSource extends FakeNode {
  buffer: FakeBuffer | null = null;
  playbackRate = new FakeParam();
  onended: (() => void) | null = null;
  started = false;
  stopped = false;
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
  /** Simule la fin de la lecture. */
  end() {
    this.onended?.();
  }
}

/** Retard (écho). */
export class FakeDelay extends FakeNode {
  delayTime = new FakeParam();
}

/** Nœud qui lit un élément <audio> (`createMediaElementSource`). */
export class FakeMediaSource extends FakeNode {
  constructor(readonly element: unknown) {
    super();
  }
}

export let contexts: FakeContext[] = [];

/** Sons décodés par `decodeAudioData`, selon le texte du Blob. */
export const decoded = new Map<string, FakeBuffer>();

export class FakeContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  destination = new FakeNode();
  oscillators: FakeOsc[] = [];
  gains: FakeGain[] = [];
  shapers: FakeShaper[] = [];
  sources: FakeBufferSource[] = [];
  mediaSources: FakeMediaSource[] = [];
  delays: FakeDelay[] = [];
  constructor() {
    contexts.push(this);
  }
  createOscillator() {
    const o = new FakeOsc();
    this.oscillators.push(o);
    return o;
  }
  createGain() {
    const g = new FakeGain();
    this.gains.push(g);
    return g;
  }
  createWaveShaper() {
    const s = new FakeShaper();
    this.shapers.push(s);
    return s;
  }
  createDelay() {
    const d = new FakeDelay();
    this.delays.push(d);
    return d;
  }
  createBufferSource() {
    const s = new FakeBufferSource();
    this.sources.push(s);
    return s;
  }
  decodeAudioData(data: ArrayBuffer) {
    const buffer = decoded.get(new TextDecoder().decode(data));
    return buffer ? Promise.resolve(buffer) : Promise.reject(new Error('illisible'));
  }
  createMediaElementSource(element: unknown) {
    const s = new FakeMediaSource(element);
    this.mediaSources.push(s);
    return s;
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

/** URL d'objet simulées : celles encore valides (non révoquées) et le Blob de chacune. */
export const objectUrls = new Map<string, Blob>();

/** Sons que l'élément <audio> sait lire, selon le texte du Blob ; les autres échouent. */
export const elementPlayable = new Set<string>();

/** Élément <audio> simulé : lit les Blob de `elementPlayable` si leur URL est encore valide. */
export class FakeAudioElement {
  static created: FakeAudioElement[] = [];
  src = '';
  preload = '';
  volume = 1;
  paused = true;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FakeAudioElement.created.push(this);
  }
  async play() {
    const blob = objectUrls.get(this.src);
    if (!blob || !elementPlayable.has(await blob.text()))
      throw new DOMException('Format non pris en charge', 'NotSupportedError');
    this.paused = false;
  }
  pause() {
    this.paused = true;
  }
  removeAttribute(name: string) {
    if (name === 'src') this.src = '';
  }
  /** Simule la fin de la lecture. */
  end() {
    this.paused = true;
    this.onended?.();
  }
}

let urlCount = 0;

/** Installe l'élément <audio> et les URL d'objet simulés. */
export function stubMediaElement() {
  vi.stubGlobal('Audio', FakeAudioElement);
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    const url = `blob:test/${++urlCount}`;
    objectUrls.set(url, blob as Blob);
    return url;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url) => {
    objectUrls.delete(url);
  });
}

export function resetFakeAudio() {
  contexts = [];
  decoded.clear();
  objectUrls.clear();
  elementPlayable.clear();
  FakeAudioElement.created = [];
}

/** Fréquences de toutes les notes synthétisées. */
export const played = () => contexts.flatMap((c) => c.oscillators.map((o) => o.frequency.value));

/** Suit la chaîne de branchements à partir d'un nœud jusqu'au haut-parleur. */
export function pathToSpeaker(ctx: FakeContext, from: FakeNode): FakeNode[] {
  const path = [from];
  let n = from;
  while (n !== ctx.destination && n.outputs.length) {
    n = n.outputs[n.outputs.length - 1];
    path.push(n);
  }
  return path;
}
