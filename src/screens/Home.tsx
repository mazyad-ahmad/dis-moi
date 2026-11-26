import { Logo } from '../components/Logo';
import { Mascot } from '../components/Mascot';
import { useNightTheme } from '../components/useNightTheme';
import { usePlayers } from '../data/players';
import { useSeance } from '../data/seance';
import { BreatheCard } from '../games/respire/BreatheCard';
import { usePlayableGames } from '../games/useGames';
import { HomeGames } from './HomeGames';
import { LastGame } from './LastGame';
import { PartyLine } from './Party';
import { SeanceOverCard } from './SeanceOver';

export function Home() {
  const players = usePlayers();
  // Seuls les jeux qui conviennent à la façon de jouer (#42) sont proposés.
  const games = usePlayableGames();
  const { over } = useSeance();
  const night = useNightTheme();

  return (
    <main className="screen">
      <div className="home__top">
        <Logo />
      </div>

      <div className="home__hello">
        <div>
          <h1 className="h1">On joue à quoi ?</h1>
          {/* Le mode d'emploi, tant qu'aucun enfant n'est inscrit ; ensuite, place aux jeux. */}
          {players?.length === 0 && (
            <p className="lead">
              Le parent tient le téléphone et pose les questions. L'enfant répond à voix haute.
            </p>
          )}
        </div>
        {/* Après la séance, la mascotte dort dans la carte « Revenir plus tard ». */}
        {!over && <Mascot mood={night ? 'sleep' : 'hello'} />}
      </div>

      {/* Qui joue et comment, en une ligne ; le panneau « La partie » règle le reste. */}
      <PartyLine />

      {over ? <SeanceOverCard /> : <HomeGames games={games} />}
      {/* Respire comme… (#126) : à part des jeux ; après la séance, dans « Revenir plus tard ». */}
      {!over && <BreatheCard />}

      <div className="spacer" />

      <LastGame />
    </main>
  );
}
