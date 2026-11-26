import { MAX_PHOTO_BYTES, MAX_PHOTO_SIZE, PhotoError, preparePhoto } from './media';

const photo = (bytes = 2000, type = 'image/jpeg') =>
  new File([new Uint8Array(bytes)], 'photo.jpg', { type });

/** Faux décodage : une image de la taille donnée, ou un échec. */
function stubBitmap(size: { width: number; height: number } | 'fail') {
  const close = vi.fn();
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => {
      if (size === 'fail') throw new DOMException('cannot decode', 'InvalidStateError');
      return { ...size, close };
    }),
  );
  return close;
}

/** Faux canvas : enregistre la taille dessinée et rend `out` (ou null). */
function stubCanvas(out: Blob | null) {
  const drawn: { width: number; height: number }[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    const { width, height } = this; // fixées avant getContext
    return {
      fillRect: () => {},
      drawImage: () => drawn.push({ width, height }),
    } as unknown as CanvasRenderingContext2D;
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(out));
  return drawn;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('preparePhoto', () => {
  it('réduit une grande photo et la recopie en mémoire', async () => {
    const close = stubBitmap({ width: 4000, height: 3000 });
    const jpeg = new Blob([new Uint8Array(500)], { type: 'image/jpeg' });
    const drawn = stubCanvas(jpeg);
    const file = photo();
    const out = await preparePhoto(file);
    expect(out).toBe(jpeg);
    expect(out).not.toBe(file);
    expect(drawn).toEqual([{ width: MAX_PHOTO_SIZE, height: 960 }]);
    expect(close).toHaveBeenCalled();
  });

  it('refuse un fichier qui n’est pas une photo', async () => {
    await expect(preparePhoto(photo(10, 'application/pdf'))).rejects.toThrow(/pas une photo/);
  });

  it('dit clairement qu’une photo illisible ne peut pas être lue', async () => {
    stubBitmap('fail');
    const err = await preparePhoto(photo(10, 'image/heic')).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PhotoError);
    expect((err as Error).message).toMatch(/ne peut pas être lue/);
  });

  it('garde une copie de l’original si la réduction échoue', async () => {
    stubBitmap({ width: 800, height: 600 });
    stubCanvas(null);
    const out = await preparePhoto(photo(1234));
    expect(out).not.toBeInstanceOf(File);
    expect(out.size).toBe(1234);
    expect(out.type).toBe('image/jpeg');
  });

  it('refuse une photo trop lourde qu’il ne sait pas réduire', async () => {
    stubBitmap({ width: 8000, height: 6000 });
    stubCanvas(null);
    await expect(preparePhoto(photo(MAX_PHOTO_BYTES + 1))).rejects.toThrow(/trop lourde/);
  });
});
