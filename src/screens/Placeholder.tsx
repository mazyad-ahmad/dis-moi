import { href } from '../app/router';
import { ScreenHeader } from '../components/ScreenHeader';
import { Mascot } from '../components/Mascot';

export function NotFound() {
  return (
    <main className="screen">
      <ScreenHeader title="Page introuvable" back="/" />
      <a href={href('/')}>Retour à l'accueil</a>
    </main>
  );
}

/** Jeu ouvert par l'adresse alors qu'il ne convient pas à la façon de jouer (#42). */
export function NotForMode({ title, mode }: { title: string; mode: string }) {
  return (
    <main className="screen">
      <ScreenHeader title={title} back="/" />
      <div className="empty">
        <Mascot mood="think" />
        <strong>Ce jeu ne se joue pas en mode {mode}</strong>
        <span className="muted">Choisis un autre jeu sur l’accueil.</span>
      </div>
      <a href={href('/')}>Retour à l'accueil</a>
    </main>
  );
}
