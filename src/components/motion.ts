/**
 * Réglage « réduire les animations » du téléphone.
 * Le CSS coupe déjà toute animation (`global.css`) ; ce test sert aux animations créées
 * en JavaScript, qu'on ne crée alors même pas.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
