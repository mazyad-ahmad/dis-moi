import { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { IconImport, IconShare } from '../components/icons';
import {
  BACKUP_EXT,
  BackupError,
  backupSummary,
  needsBackupReminder,
  readBackupFile,
  restoreBackup,
  saveBackup,
  type Backup,
  type RestoreMode,
} from '../data/backup';
import { useCustomGames } from '../data/customGames';
import { PlayerError } from '../data/players';
import { useSettings } from '../data/settings';
import { formatSize, useStorageStatus } from '../data/storage';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

function longDate(ms: number) {
  return new Date(ms).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function StorageLine() {
  const { persisted, usage } = useStorageStatus();
  if (persisted === undefined && usage === undefined) return null;
  const parts = [];
  if (persisted === true) parts.push('Stockage protégé : le navigateur ne l’effacera pas seul.');
  if (persisted === false)
    parts.push(
      'Stockage non protégé : si le téléphone manque de place, le navigateur peut l’effacer. Installer l’appli aide à le protéger.',
    );
  if (usage !== undefined) parts.push(`Place utilisée : ${formatSize(usage)}.`);
  return <p className="muted">{parts.join(' ')}</p>;
}

/** Sauvegarde lue, en attente du choix du parent : rien n'est encore modifié. */
function RestoreChoice({ backup, onDone }: { backup: Backup; onDone: (message: string) => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const s = backupSummary(backup);

  async function restore(mode: RestoreMode) {
    setBusy(true);
    setError('');
    try {
      await restoreBackup(backup, mode);
      onDone(
        mode === 'replace'
          ? 'Sauvegarde restaurée : tout a été remplacé.'
          : 'Sauvegarde ajoutée à ce qui était déjà là.',
      );
    } catch (e) {
      setError(
        e instanceof PlayerError ? e.message : 'La restauration a échoué ; rien n’a changé.',
      );
      setBusy(false);
    }
  }

  return (
    <Card className="restore-choice" role="group" aria-labelledby="restore-title">
      <h3 id="restore-title" className="h3">
        Sauvegarde du {longDate(backup.createdAt)}
      </h3>
      <p className="muted">
        {plural(s.players, 'joueur')}, {plural(s.games, 'partie')} ({plural(s.stars, 'étoile')}),{' '}
        {plural(s.customGames, 'jeu créé', 'jeux créés')}.
      </p>
      <Button variant="danger" block disabled={busy} onClick={() => void restore('replace')}>
        Tout remplacer
      </Button>
      <p className="muted restore-choice__help">
        Les données de ce téléphone sont effacées et remplacées par la sauvegarde.
      </p>
      <Button variant="secondary" block disabled={busy} onClick={() => void restore('merge')}>
        Fusionner
      </Button>
      <p className="muted restore-choice__help">
        La sauvegarde s’ajoute à ce qui est déjà là, sans doublon ; les réglages ne changent pas.
      </p>
      <Button variant="ghost" block disabled={busy} onClick={() => onDone('')}>
        Annuler
      </Button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}

export function BackupSection() {
  const { lastBackupAt } = useSettings();
  const customGames = useCustomGames();
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Backup | null>(null);
  const reminder = customGames && needsBackupReminder(lastBackupAt, customGames.length);

  async function save() {
    setStatus('');
    setError('');
    try {
      const result = await saveBackup();
      if (result === 'downloaded')
        setStatus('Sauvegarde enregistrée dans les téléchargements du téléphone.');
      if (result === 'shared') setStatus('Sauvegarde envoyée.');
    } catch {
      setError('Impossible de préparer la sauvegarde.');
    }
  }

  async function onFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = ''; // pour pouvoir choisir à nouveau le même fichier
    if (!file) return;
    setStatus('');
    setError('');
    setPending(null);
    try {
      setPending(await readBackupFile(file));
    } catch (e) {
      setError(e instanceof BackupError ? e.message : 'Impossible de lire ce fichier.');
    }
  }

  return (
    <section className="setting" aria-labelledby="backup-title">
      <h2 id="backup-title" className="eyebrow">
        Sauvegarde
      </h2>
      {reminder && (
        <p className="backup-reminder">
          {lastBackupAt === null
            ? 'Les jeux créés ne sont gardés que sur ce téléphone. Pense à les sauvegarder.'
            : 'Dernière sauvegarde il y a plus d’un mois. Pense à en refaire une.'}
        </p>
      )}
      <p className="muted">
        Un fichier avec les joueurs, les étoiles, les réglages et les jeux créés (photos et sons
        compris), pour les garder ailleurs ou les retrouver sur un autre téléphone.{' '}
        {lastBackupAt
          ? `Dernière sauvegarde : ${longDate(lastBackupAt)}.`
          : 'Aucune sauvegarde pour l’instant.'}
      </p>
      <StorageLine />
      <Button block icon={<IconShare size={20} />} onClick={() => void save()}>
        Sauvegarder tout (fichier)
      </Button>
      <label className="btn btn--secondary btn--block">
        <IconImport size={20} />
        Restaurer une sauvegarde
        <input
          type="file"
          accept={`${BACKUP_EXT},.json,application/json`}
          className="sr-only"
          onChange={(e) => void onFile(e.currentTarget)}
        />
      </label>
      {pending && (
        <RestoreChoice
          backup={pending}
          onDone={(message) => {
            setPending(null);
            setStatus(message);
          }}
        />
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="muted" role="status">
        {status}
      </p>
    </section>
  );
}
