import { useState } from 'react';
import { href } from '../app/router';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { BackupSection } from './BackupSection';
import { IconBack } from '../components/icons';
import { db, type Theme } from '../data/db';
import { clearRecords } from '../data/history';
import {
  DRAW_SECONDS_CHOICES,
  loadSettings,
  ROUND_CHOICES,
  setSetting,
  useSettings,
} from '../data/settings';
import { clock } from '../games/format';
import { promptInstall, usePwa } from '../pwa/pwa';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Jour' },
  { value: 'night', label: 'Nuit' },
];

/** Groupe de boutons radio en pilule (réglage à 3 choix). */
function Choice<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="setting">
      <legend className="eyebrow">{legend}</legend>
      <div className="segmented">
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

export function Parent() {
  const settings = useSettings();
  const [notice, setNotice] = useState('');

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
            if (
              !window.confirm('Remettre les étoiles à zéro ? L’historique des parties sera effacé.')
            )
              return;
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
            if (
              !window.confirm(
                'Tout effacer ? Joueurs, étoiles, jeux créés et réglages seront supprimés de ce téléphone.',
              )
            )
              return;
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
    </main>
  );
}
