import { playClip } from './clip';
import { audioBusy, audioOutput, resetAudioForTests } from './context';

/** Web Audio minimal : un son décodé, branché quelque part, qui finit à la demande. */
class FakeSource {
  buffer: unknown = null;
  target: unknown = null;
  onended: (() => void) | null = null;
  started = false;
  connect(n: unknown) {
    this.target = n;
    return n;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.onended?.();
  }
}
class FakeContext {
  state: AudioContextState = 'running';
  destination = {};
  sources: FakeSource[] = [];
  createGain() {
    return { gain: { value: 1 }, connect: () => {} };
  }
  createBufferSource() {
    const s = new FakeSource();
    this.sources.push(s);
    return s;
  }
  decodeAudioData = vi.fn(async () => ({ duration: 1 }));
  resume() {
    return Promise.resolve();
  }
}

let ctx: FakeContext;
beforeEach(() => {
  resetAudioForTests();
  vi.stubGlobal(
    'AudioContext',
    vi.fn(function () {
      ctx = new FakeContext();
      return ctx;
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  resetAudioForTests();
});

const blob = () => ({ arrayBuffer: async () => new ArrayBuffer(4) }) as Blob;

it('joue un son enregistré par la sortie commune, déclaré comme source', async () => {
  const clip = await playClip(blob());
  expect(clip).not.toBeNull();
  const [source] = ctx.sources;
  expect(source.started).toBe(true);
  expect(source.target).toBe(audioOutput());
  expect(audioBusy()).toBe(true);
  expect(audioBusy(clip!.playing)).toBe(false);

  clip!.stop();
  await clip!.done;
  expect(clip!.playing()).toBe(false);
  expect(audioBusy()).toBe(false);
});

it('renvoie null si le son ne se décode pas', async () => {
  await playClip(blob()).then((c) => c?.stop());
  ctx.decodeAudioData.mockRejectedValueOnce(new Error('format'));
  expect(await playClip(blob())).toBeNull();
});

it('renvoie null sans Web Audio', async () => {
  vi.unstubAllGlobals();
  resetAudioForTests();
  expect(await playClip(blob())).toBeNull();
});
