import { useState } from 'react';
import { href } from '../app/router';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useConfirm } from '../components/useConfirm';
import { ScreenHeader } from '../components/ScreenHeader';
import { BackupSection } from './BackupSection';
import { IconBack } from '../components/icons';
import { db, type Theme } from '../data/db';
import { clearRecords } from '../data/history';
import { lock, unlock } from '../data/parentLock';
import { extend, resetSeance, SESSION_CHOICES, useSeance } from '../data/seance';
import {
  DRAW_SECONDS_CHOICES,
  loadSettings,
  READ_ALOUD_CHOICES,
  ROUND_CHOICES,
  setSetting,
  useSettings,
} from '../data/settings';
import { clock } from '../games/format';
import { promptInstall, usePwa } from '../pwa/pwa';
import { useFrenchVoice } from '../voice/speech';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Jour' },
  { value: 'night', label: 'Nuit' },
];

const READ_ALOUD_LABELS = { normal: 'Normale', slow: 'Lente', off: 'Non' } as const;

/** Lecture à voix haute (#35) : proposée seulement avec une voix française locale. */
function ReadAloudSetting() {
  const { readAloud } = useSettings();
  const voice = useFrenchVoice();
  if (!voice)
    return (
      <section className="setting" aria-labelledby="read-aloud-title">
        <h2 id="read-aloud-title" className="eyebrow">
          Lecture à voix haute
        </h2>
        <p className="muted">
          Aucune voix française installée sur ce téléphone : le bouton « Lire » n’apparaît pas.
        </p>
      </section>
    );
  return (
    <Choice
      legend="Lecture à voix haute"
      name="read-aloud"
      value={readAloud}
      options={READ_ALOUD_CHOICES.map((v) => ({ value: v, label: READ_ALOUD_LABELS[v] }))}
      onChange={(v) => void setSetting('readAloud', v)}
      hint="Bouton « Lire » sur les questions, les mots et les consignes, avec la voix du téléphone, sans réseau."
    />
  );
}

const LOCK_CHOICES = [
  { value: 'off', label: 'Désactivé' },
  { value: 'on', label: 'Activé' },
] as const;

const VIBRATION_CHOICES = [
  { value: 'off', label: 'Sans' },
  { value: 'on', label: 'Avec' },
] as const;

/** Groupe de boutons radio en pilule (réglage à 3 choix). */
function Choice<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
  className,
  hint,
}: {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
  hint?: string;
}) {
  return (
    <fieldset className="setting">
      <legend className="eyebrow">{legend}</legend>
      <div className={['segmented', className].filter(Boolean).join(' ')}>
        {options.map((o) => (
          <label key={o.value}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
      {hint && <p className="muted">{hint}</p>}
    </fieldset>
  );
}

function LinkRow({ path, title, detail }: { path: string; title: string; detail: string }) {
  return (
    <a className="settings-row" href={href(path)}>
      <span>
        <strong>{title}</strong>
        <br />
        <span className="muted">{detail}</span>
      </span>
      <IconBack style={{ transform: 'rotate(180deg)' }} />
    </a>
  );
}

async function eraseEverything() {
  await db.transaction('rw', [db.players, db.games, db.customGames, db.settings], async () => {
    await Promise.all([
      db.players.clear(),
      db.games.clear(),
      db.customGames.clear(),
      db.settings.clear(),
    ]);
  });
  resetSeance();
  await loadSettings();
}

/** Installer l'appli sur l'écran d'accueil : bouton si Chrome le propose, sinon la marche à suivre. */
function Install() {
  const { install, installed } = usePwa();
  if (installed) return null;
  return (
    <section className="setting" aria-labelledby="install-title">
      <h2 id="install-title" className="eyebrow">
        Appli
      </h2>
      {install ? (
        <Button block onClick={() => void promptInstall()}>
          Installer l’appli
        </Button>
      ) : (
        <p className="muted">
          Pour l’avoir sur l’écran d’accueil et jouer sans réseau : dans Chrome, menu ⋮ puis «
          Ajouter à l’écran d’accueil ».
        </p>
      )}
    </section>
  );
}

/** Séance terminée ou en cours : le parent peut accorder un peu de temps ou repartir à zéro. */
function SeanceControls() {
  const seance = useSeance();
  if (!seance.active) return null;
  return (
    <section className="setting" aria-labelledby="seance-title">
      <h2 id="seance-title" className="eyebrow">
        Séance
      </h2>
      <p className="muted" role="status">
        {seance.over
          ? 'La séance est terminée.'
          : seance.lastGame || seance.nextIsLast
            ? 'La dernière partie est annoncée.'
            : 'Une séance est en cours.'}
      </p>
      <Button variant="secondary" block onClick={() => extend()}>
        Prolonger de 10 minutes
      </Button>
      <Button variant="ghost" block onClick={() => resetSeance()}>
        Nouvelle séance
      </Button>
    </section>
  );
}

export function Parent() {
  const settings = useSettings();
  const [notice, setNotice] = useState('');
  const [confirmDialog, confirm] = useConfirm();

  return (
    <main className="screen">
      <ScreenHeader title="Espace parent" />

      <Card>
        <LinkRow path="/joueurs" title="Joueurs" detail="Prénoms des enfants" />
        <LinkRow path="/ajouter" title="Jeux" detail="Catalogue et jeux créés" />
      </Card>

      <Choice
        legend="Thème"
        name="theme"
        value={settings.theme}
        options={THEMES}
        onChange={(v) => void setSetting('theme', v)}
      />
      <Choice
        legend="Manches par partie"
        name="rounds"
        value={settings.rounds}
        options={ROUND_CHOICES.map((n) => ({ value: n, label: String(n) }))}
        onChange={(v) => void setSetting('rounds', v)}
      />
      <Choice
        legend="Minuteur de Dessine ça"
        name="draw-seconds"
        value={settings.drawSeconds}
        options={DRAW_SECONDS_CHOICES.map((n) => ({ value: n, label: clock(n) }))}
        onChange={(v) => void setSetting('drawSeconds', v)}
      />

      <ReadAloudSetting />

      <Choice
        legend="Vibrations"
        name="vibrations"
        value={settings.vibrations ? 'on' : 'off'}
        options={VIBRATION_CHOICES}
        onChange={(v) => void setSetting('vibrations', v === 'on')}
        className="segmented--2"
        hint="Une petite vibration sur « Trouvé », à la fin du minuteur et de la partie, sur les téléphones qui le permettent. Jamais pendant le dessin."
      />

      <Choice
        legend="Verrou parent"
        name="parent-lock"
        value={settings.parentLock ? 'on' : 'off'}
        options={LOCK_CHOICES}
        onChange={(v) => {
          // Activer depuis l'espace Parent ne met pas le parent dehors ; désactiver oublie le déverrouillage.
          if (v === 'on') unlock();
          else lock();
          void setSetting('parentLock', v === 'on');
        }}
        className="segmented--2"
        hint="Une petite opération avant l’espace Parent, les joueurs et les jeux."
      />

      <Choice
        legend="Durée d’une séance"
        name="session-minutes"
        value={settings.sessionMinutes}
        options={SESSION_CHOICES.map((n) => ({ value: n, label: n ? String(n) : 'Non' }))}
        onChange={(v) => {
          resetSeance();
          void setSetting('sessionMinutes', v);
        }}
        className="segmented--5"
        hint="En minutes, à partir du premier jeu. La partie en cours va jusqu’au bout, puis on range."
      />
      <SeanceControls />

      <Install />

      <BackupSection />

      <section className="setting" aria-labelledby="reset-title">
        <h2 id="reset-title" className="eyebrow">
          Remise à zéro
        </h2>
        <Button
          variant="secondary"
          block
          onClick={async () => {
            const ok = await confirm({
              title: 'Remettre les étoiles à zéro ?',
              message: 'L’historique des parties sera effacé.',
              confirmLabel: 'Remettre à zéro',
              danger: true,
            });
            if (!ok) return;
            await clearRecords();
            setNotice('Les étoiles sont remises à zéro.');
          }}
        >
          Remettre les étoiles à zéro
        </Button>
        <Button
          variant="danger"
          block
          onClick={async () => {
            const ok = await confirm({
              title: 'Tout effacer ?',
              message: 'Joueurs, étoiles, jeux créés et réglages seront supprimés de ce téléphone.',
              confirmLabel: 'Tout effacer',
              danger: true,
            });
            if (!ok) return;
            await eraseEverything();
            setNotice('Toutes les données ont été effacées.');
          }}
        >
          Effacer toutes les données
        </Button>
        <p className="muted" role="status">
          {notice}
        </p>
      </section>

      <p className="muted">
        Toutes les données restent sur ce téléphone : pas de compte, pas de publicité, pas de suivi.{' '}
        <a href={href('/confidentialite')}>Confidentialité</a>
      </p>
      {confirmDialog}
    </main>
  );
}
