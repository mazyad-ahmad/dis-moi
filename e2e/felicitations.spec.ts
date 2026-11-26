import { expect, test, type Page } from '@playwright/test';

// #116 : félicitations parlées au « Trouvé » et en fin de partie.
// Comme pour la lecture à voix haute, on simule les voix du téléphone en notant ce qui est dit,
// et on compte les sons enregistrés joués par le contexte audio partagé.

declare global {
  interface Window {
    said: string[];
    clips: number;
  }
}

async function phone(page: Page, withVoice: boolean) {
  await page.addInitScript((voice) => {
    window.said = [];
    window.clips = 0;
    const voices = voice
      ? [{ name: 'Français', lang: 'fr-FR', localService: true, default: true, voiceURI: 'fr' }]
      : [];
    class Utterance extends EventTarget {
      voice: unknown = null;
      lang = '';
      rate = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {
        super();
      }
    }
    const synth = Object.assign(new EventTarget(), {
      getVoices: () => voices,
      speak(u: Utterance) {
        window.said.push(u.text);
        setTimeout(() => u.onend?.(), 300);
      },
      cancel() {},
    });
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: Utterance,
      configurable: true,
    });
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      createBufferSource() {
        window.clips++;
        return super.createBufferSource();
      }
    };
  }, withVoice);
}

const said = (page: Page) => page.evaluate(() => window.said);

test('« Bravo ! » au Trouvé, rien sur Passer, une phrase de fête en fin de partie', async ({
  page,
}) => {
  await phone(page, true);
  const requests: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== 'http://localhost:4173')
      requests.push(r.url());
  });
  await page.goto('./#/parent');
  await page
    .getByRole('group', { name: 'Manches par partie' })
    .getByText('5', { exact: true })
    .click();

  await page.goto('./#/jeu/lettres');
  await page.getByRole('button', { name: 'Passer' }).click();
  await page.waitForTimeout(1500);
  expect(await said(page)).toEqual([]);

  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('Manche 3 sur 5')).toBeVisible();
  await expect.poll(() => said(page)).toHaveLength(1);
  expect(['Bravo !', 'Super !', 'Bien joué !', 'Génial !', 'Trop fort !']).toContain(
    (await said(page))[0],
  );

  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect(page.getByText('4 étoiles gagnées ensemble !')).toBeVisible();
  await expect
    .poll(async () => (await said(page)).at(-1))
    .toBe('Vous avez gagné 4 étoiles ensemble !');
  expect(requests).toEqual([]);
});

test('réglage coupé : aucune voix', async ({ page }) => {
  await phone(page, true);
  await page.goto('./#/parent');
  await page
    .getByRole('group', { name: 'Félicitations parlées' })
    .getByRole('radio', { name: 'Désactivées', exact: true })
    .check();
  await page.goto('./#/jeu/lettres');
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await page.waitForTimeout(2000);
  expect(await said(page)).toEqual([]);
});

test('sans voix, les félicitations du parent sont enregistrées, jouées puis effacées', async ({
  page,
}) => {
  await phone(page, false);
  await page.goto('./#/parent');
  const group = page.getByRole('group', { name: 'Félicitations parlées' });
  await expect(group.getByText(/Pas de voix française sur ce téléphone/)).toBeVisible();
  await expect(group.getByRole('radio')).toHaveCount(0);

  await group.getByRole('button', { name: 'Enregistrer une félicitation' }).click();
  await page.waitForTimeout(800);
  await group.getByRole('button', { name: 'Arrêter' }).click();
  await expect(group.getByText('Félicitation 1')).toBeVisible();
  await expect(group.getByRole('radio', { name: 'Activées', exact: true })).toBeChecked();

  await page.goto('./#/jeu/lettres');
  await page.getByRole('button', { name: 'Trouvé' }).click();
  await expect.poll(() => page.evaluate(() => window.clips)).toBeGreaterThan(0);
  expect(await said(page)).toEqual([]);

  await page.goto('./#/parent');
  await page.getByRole('button', { name: 'Effacer toutes les données' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Tout effacer' }).click();
  await expect(page.getByText('Toutes les données ont été effacées.')).toBeVisible();
  await expect(page.getByText('Félicitation 1')).toHaveCount(0);
});
