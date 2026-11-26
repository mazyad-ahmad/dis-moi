import { href } from '../app/router';
import { Mascot } from '../components/Mascot';

/**
 * Après la fin de séance (#120) : plus de jeux à lancer, seulement « Revenir plus tard ».
 * Le parent prolonge depuis son espace.
 */
export function SeanceOverCard() {
  return (
    <section className="seance-over" aria-labelledby="seance-over-title">
      <Mascot mood="sleep" size={88} />
      <h2 id="seance-over-title" className="seance-over__title">
        Revenir plus tard
      </h2>
      <p className="lead">On a bien joué ! Les jeux se reposent, eux aussi.</p>
      <p className="muted">
        Pour prolonger, le parent passe par l’<a href={href('/parent')}>espace parent</a>.
      </p>
    </section>
  );
}

/** Un jeu ouvert par l'adresse après la fin de séance. */
export function SeanceOver() {
  return (
    <main className="screen">
      <div className="spacer" />
      <SeanceOverCard />
      <div className="spacer" />
      <a className="btn btn--secondary btn--block" href={href('/')}>
        Accueil
      </a>
    </main>
  );
}
