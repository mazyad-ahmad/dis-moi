import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// #35 : lecture à voix haute par la synthèse vocale du téléphone.
// Chromium sans tête n'a pas toujours de voix : on simule celles du téléphone, en notant ce
// qui est lu. La vérification sur un vrai appareil (mode avion) reste à faire à la main.

declare global {
  interface Window {
    spoken: { text: string; voice: string; rate: number }[];
    pendingSpeech: number;
  }
}

async function phoneVoices(page: Page, localService: boolean) {
  await page.addInitScript((local) => {
    const voices = [
      { name: 'Français', lang: 'fr-FR', localService: local, default: true, voiceURI: 'fr' },
    ];
    window.spoken = [];
    window.pendingSpeech = 0;
    class Utterance extends EventTarget {
      voice: { name: string } | null = null;
      lang = '';
      rate = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {
        super();
      }
    }
    let pending: Utterance[] = [];
    const synth = Object.assign(new EventTarget(), {
      getVoices: () => voices,
      speak(u: Utterance) {
        window.spoken.push({ text: u.text, voice: u.voice?.name ?? '', rate: u.rate });
        pending.push(u);
        window.pendingSpeech = pending.length;
      },
      cancel() {
        const stopped = pending;
        pending = [];
        window.pendingSpeech = 0;
        stopped.forEach((u) => u.onerror?.());
      },
    });
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: Utterance,
      configurable: true,
    });
  }, localService);
}

test('le bouton « Lire » lit la consigne sans réseau et s’arrête à la manche suivante', async ({
  page,
}) => {
  await phoneVoices(page, true);
  await page.goto('./#/jeu/lettres');
  await expect(page.getByRole('button', { name: 'Lire' })).toBeVisible();

  // Rien ne part du téléphone : aucune requête hors de l'appli (ses polices et fichiers
  // viennent du cache du service worker).
  const requests: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== 'http://localhost:4173')
      requests.push(r.url());
  });
  await page.getByRole('button', { name: 'Lire' }).click();
  await expect(page.getByRole('button', { name: 'Arrêter la lecture' })).toBeVisible();
  const spoken = await page.evaluate(() => window.spoken);
  expect(spoken).toHaveLength(1);
  expect(spoken[0]).toMatchObject({ voice: 'Français', rate: 1 });
  await expect(page.getByLabel('Pour le parent')).toContainText(spoken[0].text);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);

  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 2 sur 10')).toBeVisible();
  expect(await page.evaluate(() => window.pendingSpeech)).toBe(0);
  await expect(page.getByRole('button', { name: 'Lire' })).toBeVisible();
  expect(requests).toEqual([]);
});

test('vitesse lente réglée dans l’espace Parent', async ({ page }) => {
  await phoneVoices(page, true);
  await page.goto('./#/parent');
  await page.getByRole('group', { name: 'Lecture à voix haute' }).getByText('Lente').click();
  await page.goto('./#/jeu/dessin');
  await page.getByRole('button', { name: 'Lire' }).click();
  const [said] = await page.evaluate(() => window.spoken);
  expect(said.rate).toBeLessThan(1);
  await expect(page.getByLabel('Mot à dessiner')).toContainText(said.text);
});

test('sans voix française locale, pas de bouton « Lire »', async ({ page }) => {
  await phoneVoices(page, false);
  await page.goto('./#/jeu/lettres');
  await expect(page.getByRole('heading', { name: 'Quelle lettre ?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lire' })).toHaveCount(0);
  await page.goto('./#/parent');
  await expect(page.getByText(/Aucune voix française installée/)).toBeVisible();
});
