import type { Page } from '@playwright/test';

/**
 * Valeur d'un réglage telle qu'écrite dans IndexedDB. Un réglage s'affiche avant d'être écrit :
 * l'attendre avec `expect.poll` avant un `page.reload()`.
 */
export const storedSetting = (page: Page, key: string) =>
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
