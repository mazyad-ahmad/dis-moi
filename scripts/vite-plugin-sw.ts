import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

// .woff : les navigateurs qui ont un service worker lisent le .woff2.
const SKIP = [/\.map$/, /\.woff$/, /^sw\.js$/];

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])),
  );
  return files.flat();
}

/**
 * Écrit dist/sw.js après le build : liste de tous les fichiers à mettre en cache
 * et version calculée sur leur contenu (elle change dès qu'un fichier change).
 */
export function serviceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'dis-moi-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      const template = await readFile(new URL('./sw.js', import.meta.url), 'utf8');
      // Version : contenu du service worker et de tous les fichiers mis en cache.
      const hash = createHash('sha256').update(template);
      const files: string[] = [];
      for (const file of (await walk(outDir)).sort()) {
        const path = relative(outDir, file).split(sep).join('/');
        if (SKIP.some((re) => re.test(path))) continue;
        files.push(path === 'index.html' ? './' : `./${path}`);
        if (path === 'index.html') files.push('./index.html');
        hash.update(path).update(await readFile(file));
      }
      const sw = template
        .replace("'__VERSION__'", JSON.stringify(hash.digest('hex').slice(0, 12)))
        .replace(
          'const PRECACHE = __PRECACHE__;',
          `const PRECACHE = ${JSON.stringify(files, null, 2)};`,
        );
      await writeFile(join(outDir, 'sw.js'), sw);
    },
  };
}
