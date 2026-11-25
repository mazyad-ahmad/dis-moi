import { href } from '../app/router';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconBack } from '../components/icons';
import type { Theme } from '../data/db';
import { setTheme, useTheme } from '../data/settings';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Jour' },
  { value: 'night', label: 'Nuit' },
];

export function Parent() {
  const theme = useTheme();
  return (
    <main className="screen">
      <ScreenHeader title="Espace parent" />

      <Card>
        <a className="settings-row" href={href('/joueurs')}>
          <span>
            <strong>Joueurs</strong>
            <br />
            <span className="muted">Prénoms des enfants</span>
          </span>
          <IconBack style={{ transform: 'rotate(180deg)' }} />
        </a>
      </Card>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="eyebrow" style={{ marginBottom: 8 }}>
          Thème
        </legend>
        <div className="segmented">
          {THEMES.map((t) => (
            <label key={t.value}>
              <input
                type="radio"
                name="theme"
                value={t.value}
                checked={theme === t.value}
                onChange={() => setTheme(t.value)}
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="muted">Les autres réglages arrivent avec l'espace parent complet.</p>
    </main>
  );
}
