/**
 * Image d'un dessin pour la galerie (#52) : le dessin tel qu'il est à l'écran, sur le fond de
 * la zone de dessin, en PNG (net et sans perte, léger pour des traits sur fond uni).
 */

/** Côté le plus long de l'image gardée, en pixels (comme les photos des jeux créés). */
export const MAX_DRAWING_SIZE = 1280;

/** Taille de l'image : celle du canvas, réduite sans déformer si elle dépasse `max`. */
export function snapshotSize(w: number, h: number, max = MAX_DRAWING_SIZE) {
  const scale = Math.min(1, max / Math.max(w, h, 1));
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

/** Fond de l'image : celui de la zone de dessin, blanc s'il est transparent. */
export function backgroundOf(el: Element | null): string {
  const bg = el ? getComputedStyle(el).backgroundColor : '';
  return !bg || bg === 'transparent' || /^rgba\(.*,\s*0\)$/.test(bg) ? '#ffffff' : bg;
}

/** PNG du canvas sur son fond ; `null` si le navigateur n'y arrive pas. */
export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const { w, h } = snapshotSize(canvas.width, canvas.height);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = backgroundOf(canvas.parentElement);
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(canvas, 0, 0, w, h);
  return new Promise((resolve) => {
    try {
      out.toBlob((blob) => resolve(blob), 'image/png');
    } catch {
      resolve(null);
    }
  });
}
