import { expect, test } from '@playwright/test';

// #30 : sons d'interface synthétisés, coupables dans l'espace Parent.

test.beforeEach(async ({ page }) => {
  // Compte les notes jouées par le synthétiseur et les contextes audio créés.
  await page.addInitScript(() => {
    const w = window as unknown as {
      notes: number;
      contexts: number;
      ceiling: number;
      volumes: GainNode[];
    };
    w.notes = 0;
    w.contexts = 0;
    w.ceiling = -1;
    w.volumes = [];
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        w.contexts++;
      }
      createOscillator() {
        w.notes++;
        return super.createOscillator();
      }
      // #121 : plafond (WaveShaper) puis volume de l'appli (le nœud créé juste après).
      createWaveShaper() {
        const shaper = super.createWaveShaper();
        const set = Object.getOwnPropertyDescriptor(WaveShaperNode.prototype, 'curve')!.set!;
        Object.defineProperty(shaper, 'curve', {
          set(c: Float32Array) {
            w.ceiling = Math.max(...Array.from(c, Math.abs));
            set.call(shaper, c);
          },
        });
        const createGain = this.createGain.bind(this);
        this.createGain = () => {
          const g = createGain();
          w.volumes.push(g);
          this.createGain = createGain;
          return g;
        };
        return shaper;
      }
    };
  });
});

const notes = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { notes: number }).notes);

const storedSetting = (page: import('@playwright/test').Page, key: string) =>
  page.evaluate(
    (k) =>
      new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open('dis-moi');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction('settings').objectStore('settings').get(k);
          req.onsuccess = () => {
            open.result.close();
            resolve((req.result as { value?: unknown } | undefined)?.value);
          };
          req.onerror = () => reject(req.error);
        };
      }),
    key,
  );

test('Trouvé et Passer jouent un son, réglage coupé : plus rien', async ({ page }) => {
  await page.goto('./#/jeu/lettres');
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect.poll(() => notes(page)).toBeGreaterThan(0);
  const afterFound = await notes(page);
  await page.getByRole('button', { name: 'Passer' }).click();
  await expect.poll(() => notes(page)).toBeGreaterThan(afterFound);
  expect(await page.evaluate(() => (window as unknown as { contexts: number }).contexts)).toBe(1);

  await page.goto('./#/parent');
  await page.getByText('Désactivés', { exact: true }).click();
  // Attendre que le réglage soit écrit dans IndexedDB avant de recharger.
  await expect.poll(() => storedSetting(page, 'sounds')).toBe(false);
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Désactivés' })).toBeChecked();

  await page.goto('./#/jeu/lettres');
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await page.getByRole('button', { name: 'Passer' }).click();
  await expect(page.getByText(/^Manche 3 sur/)).toBeVisible();
  expect(await notes(page)).toBe(0);
});

test('volume de l’appli : plafond toujours, doux par défaut, normal au choix', async ({ page }) => {
  const level = () =>
    page.evaluate(() => {
      const w = window as unknown as { ceiling: number; volumes: GainNode[] };
      return { ceiling: w.ceiling, volume: w.volumes[0]?.gain.value };
    });
  await page.goto('./#/jeu/lettres');
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect.poll(() => notes(page)).toBeGreaterThan(0);
  const soft = await level();
  expect(soft.ceiling).toBeGreaterThan(0);
  expect(soft.ceiling).toBeLessThanOrEqual(0.5);
  expect(soft.volume).toBe(0.5);

  await page.goto('./#/parent');
  await expect(page.getByRole('radio', { name: 'Doux' })).toBeChecked();
  await page.getByText('Normal', { exact: true }).click();
  await expect.poll(() => storedSetting(page, 'volume')).toBe('normal');
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Normal' })).toBeChecked();

  await page.goto('./#/jeu/lettres');
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect.poll(async () => (await level()).volume).toBe(1);
});
