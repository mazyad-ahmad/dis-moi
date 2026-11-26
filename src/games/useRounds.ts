import { useCallback, useEffect, useRef, useState } from 'react';
import { answerSound, playSound, soundLength } from '../audio/sounds';
import { listRecords, REWARDS, startRecord, totalStars, updateRecord } from '../data/history';
import { beginGame, endGame, touch } from '../data/seance';
import { DEFAULT_SETTINGS, getSettings } from '../data/settings';
import { vibrate } from '../pwa/haptics';
import { useWakeLock } from '../pwa/useWakeLock';
import { cancelPraise, praise } from '../voice/praise';
import { gentleEnd, modeRounds } from './modes';
import { allMembers, teamScores, type TeamScore } from './teams';
import { rotation, turnAt } from './turns';
import { useTeamTurns } from './useTeams';
import { clearSaved, readSaved, useClearSavedOnLeave, useSaved, writeSaved } from './session';

/** Nombre de manches par défaut (docs/FONCTIONNEMENT.md), réglable dans l'espace Parent. */
export const DEFAULT_ROUNDS = DEFAULT_SETTINGS.rounds;

/** Nombre de manches réglé (3 en mode Express, #42), figé au lancement de la partie. */
export function useRoundSetting(): number {
  return useState(() => modeRounds(getSettings().rounds, getSettings().gameMode))[0];
}

export interface Rounds {
  /** Manche en cours, à partir de 1. */
  round: number;
  rounds: number;
  stars: number;
  finished: boolean;
  /** Trouvé (+1 étoile) ou Passer / Pas encore (0). */
  answer: (found: boolean) => void;
  /** En équipes (#44) : l'équipe de la manche en cours, avec ses étoiles. */
  team?: TeamScore;
  /** En équipes : les étoiles de chaque équipe, dans l'ordre de l'écran des équipes. */
  teams?: TeamScore[];
}

interface Progress {
  played: number;
  stars: number;
  /** En équipes (#44) : manche trouvée ou non, pour les étoiles de chaque équipe. */
  found?: boolean[];
}

function restoreProgress(saved: unknown): Progress | undefined {
  const p = saved as Partial<Progress> | null;
  const ok = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;
  if (!p || !ok(p.played) || !ok(p.stars) || p.stars > p.played) return undefined;
  if (p.found === undefined) return { ...p } as Progress;
  const found = p.found;
  return Array.isArray(found) &&
    found.length === p.played &&
    found.every((f) => typeof f === 'boolean') &&
    found.filter(Boolean).length === p.stars
    ? ({ ...p } as Progress)
    : undefined;
}

/**
 * Déroulé commun des jeux : manches, étoiles, fin de partie.
 * La partie est enregistrée dès la première manche puis mise à jour,
 * pour garder les étoiles même si on quitte en cours de route.
 * Elle est aussi gardée pour l'onglet (`session.ts`) : un rafraîchissement la reprend
 * là où elle en était, sans créer de doublon dans l'historique.
 */
export function useRounds(
  gameId: string,
  wanted?: number,
  /** Tour par tour (#38) : ordre des joueurs, pour noter qui a joué chaque manche. */
  order?: readonly number[],
): Rounds {
  const setting = useRoundSetting();
  const rounds = wanted ?? setting;
  // En équipes (#44) : les équipes jouent à tour de rôle, ordre tiré au sort au lancement.
  const party = useTeamTurns(gameId);
  // Façon de jouer (#42), figée au lancement et notée avec la partie.
  const [mode] = useState(() => getSettings().gameMode);
  // Fin de séance (#120) : une partie neuve compte ; une partie reprise, déjà comptée.
  useState(() => {
    if (readSaved(gameId, 'progress') === undefined) beginGame();
  });
  const [progress, setProgress] = useSaved<Progress>(
    gameId,
    'progress',
    () => (party ? { played: 0, stars: 0, found: [] } : { played: 0, stars: 0 }),
    (saved) => {
      const p = restoreProgress(saved);
      return p && !!party === !!p.found ? p : undefined;
    },
  );
  const { played, stars, found: foundRounds } = progress;
  const scores = party && teamScores(party.teams, party.order, foundRounds ?? []);
  // Partie reprise après un rafraîchissement : on continue son enregistrement.
  const [resumed] = useState(() => {
    const id = readSaved(gameId, 'record');
    return Number.isInteger(id) ? Promise.resolve(id as number) : null;
  });
  const record = useRef<Promise<number> | null>(resumed);
  useClearSavedOnLeave(gameId);

  // Étoiles des autres parties, pour reconnaître une récompense débloquée (son « récompense »).
  const others = useRef<number | null>(null);
  const [starsAtStart] = useState(stars);
  useEffect(() => {
    let live = true;
    void listRecords()
      .then((r) => {
        if (live) others.current = totalStars(r) - starsAtStart;
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [starsAtStart]);

  const answer = useCallback(
    (found: boolean) => {
      if (played >= rounds) return;
      const progressed = { played: played + 1, stars: stars + (found ? 1 : 0) };
      const foundNow = party ? [...(foundRounds ?? []), found] : undefined;
      setProgress(foundNow ? { ...progressed, found: foundNow } : progressed);
      const data = {
        ...progressed,
        ...(order?.length && { turns: rotation(order, progressed.played) }),
        // Étoiles par équipe ; le total commun (`stars`) rejoint celles de la famille.
        ...(party && foundNow && { teams: teamScores(party.teams, party.order, foundNow) }),
      };
      const total = others.current === null ? null : others.current + data.stars;
      const finished = data.played >= rounds;
      const sound = answerSound(found, finished, total, REWARDS);
      void playSound(sound);
      // Félicitation parlée (#116), après le son : jamais sur « Passer », toujours en fin de partie.
      if (found || finished)
        praise({
          stars: finished ? data.stars : undefined,
          afterMs: getSettings().sounds ? soundLength(sound) * 1000 + 150 : 0,
        });
      if (finished) {
        clearSaved(gameId);
        endGame();
        // Mode Coucher : fin en douceur, sans vibration de fête.
        if (!gentleEnd(mode)) vibrate('party');
      } else {
        touch();
        if (found) vibrate('found');
      }
      if (!record.current) {
        // En équipes, seuls les enfants de la famille sont notés : les invités ne sont pas gardés.
        const family = party
          ? allMembers(party.teams).flatMap((m) => (m.playerId === undefined ? [] : [m.playerId]))
          : undefined;
        record.current = startRecord({ gameId, rounds, mode, ...data }, family);
        void record.current.then((id) => writeSaved(gameId, 'record', id, true));
      } else void record.current.then((id) => updateRecord(id, data));
    },
    [gameId, mode, order, party, foundRounds, played, rounds, setProgress, stars],
  );

  // Quitter ou rejouer la partie coupe la félicitation en cours.
  useEffect(() => cancelPraise, []);

  // L'enfant réfléchit, le parent attend : l'écran ne doit pas s'éteindre en pleine partie.
  useWakeLock(played < rounds);

  return {
    round: Math.min(played + 1, rounds),
    rounds,
    stars,
    finished: played >= rounds,
    answer,
    ...(party &&
      scores && {
        team: scores[turnAt(party.order, Math.min(played + 1, rounds))],
        teams: scores,
      }),
  };
}
