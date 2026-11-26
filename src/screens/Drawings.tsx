import { useId, useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Dialog } from '../components/Dialog';
import { ScreenHeader } from '../components/ScreenHeader';
import { useConfirm } from '../components/useConfirm';
import { IconShare, IconTrash } from '../components/icons';
import type { Drawing, Player } from '../data/db';
import {
  CLEANUP_COUNT,
  CLEANUP_FROM,
  deleteDrawing,
  deleteOldestDrawings,
  drawingsSize,
  MAX_DRAWINGS,
  shareDrawing,
  useDrawings,
} from '../data/drawings';
import { usePlayers } from '../data/players';
import { formatSize } from '../data/storage';
import { useObjectUrl } from '../games/deck/useObjectUrl';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

function longDate(ms: number) {
  return new Date(ms).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Prénoms des enfants du dessin encore dans la liste des joueurs. */
function namesOf(drawing: Drawing, players: readonly Player[]): string {
  const byId = new Map(players.map((p) => [p.id, p.name]));
  const names = drawing.playerIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
}

function Thumb({
  drawing,
  names,
  onOpen,
}: {
  drawing: Drawing;
  names: string;
  onOpen: () => void;
}) {
  const url = useObjectUrl(drawing.image);
  const label = [drawing.word, names, longDate(drawing.createdAt)].filter(Boolean).join(', ');
  return (
    <li>
      <button type="button" className="gallery__item" aria-label={label} onClick={onOpen}>
        {url && <img src={url} alt="" />}
        <span className="gallery__word">{drawing.word}</span>
        <span className="gallery__meta muted">
          {[names, longDate(drawing.createdAt)].filter(Boolean).join(' · ')}
        </span>
      </button>
    </li>
  );
}

/** Le dessin en grand, avec le partage et la suppression (gestes du parent). */
function Viewer({
  drawing,
  names,
  onClose,
}: {
  drawing: Drawing;
  names: string;
  onClose: () => void;
}) {
  const id = useId();
  const url = useObjectUrl(drawing.image);
  const [confirmDialog, confirm] = useConfirm();
  const [status, setStatus] = useState('');

  async function share() {
    setStatus('');
    try {
      const result = await shareDrawing(drawing);
      if (result === 'downloaded') setStatus('Image enregistrée dans les téléchargements.');
      if (result === 'shared') setStatus('Image envoyée.');
    } catch {
      setStatus('Impossible de partager ce dessin.');
    }
  }

  async function remove() {
    const ok = await confirm({
      title: 'Supprimer ce dessin ?',
      message: `« ${drawing.word} » sera retiré de la galerie.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    await deleteDrawing(drawing.id);
    onClose();
  }

  return (
    <Dialog labelledBy={`${id}-title`} onClose={onClose}>
      <h2 id={`${id}-title`} className="dialog__title">
        {drawing.word}
      </h2>
      <p className="dialog__message">
        {[names, longDate(drawing.createdAt)].filter(Boolean).join(' · ')}
      </p>
      {url && <img className="gallery__full" src={url} alt={`Dessin : ${drawing.word}`} />}
      <div className="dialog__actions">
        <Button block icon={<IconShare size={20} />} onClick={() => void share()}>
          Partager l’image
        </Button>
        <Button
          variant="secondary"
          block
          icon={<IconTrash size={20} />}
          onClick={() => void remove()}
        >
          Supprimer
        </Button>
        <Button variant="ghost" block onClick={onClose}>
          Fermer
        </Button>
      </div>
      <p className="muted" role="status">
        {status}
      </p>
      {confirmDialog}
    </Dialog>
  );
}

/** Galerie des dessins gardés (#52), dans l'espace Parent. */
export function Drawings() {
  const drawings = useDrawings();
  const players = usePlayers() ?? [];
  const [openId, setOpenId] = useState<number | null>(null);
  const [confirmDialog, confirm] = useConfirm();
  const open = drawings?.find((d) => d.id === openId);

  async function cleanup() {
    const ok = await confirm({
      title: `Supprimer les ${CLEANUP_COUNT} plus anciens ?`,
      message: 'Pensez à sauvegarder avant, pour les garder ailleurs.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (ok) await deleteOldestDrawings();
  }

  return (
    <main className="screen">
      <ScreenHeader title="Dessins gardés" back="/parent" />
      {drawings && drawings.length === 0 && (
        <Card>
          <p className="muted">
            Aucun dessin pour l’instant. Dans Dessine ça, touchez « Garder » sur un dessin pour le
            retrouver ici.
          </p>
        </Card>
      )}
      {drawings && drawings.length > 0 && (
        <>
          <p className="muted">
            {plural(drawings.length, 'dessin')} sur {MAX_DRAWINGS} ·{' '}
            {formatSize(drawingsSize(drawings))}. Ils restent sur ce téléphone et sont compris dans
            la sauvegarde complète.
          </p>
          {drawings.length >= CLEANUP_FROM && (
            <Card className="gallery__cleanup">
              <p>
                {drawings.length >= MAX_DRAWINGS
                  ? 'La galerie est pleine : on ne peut plus garder de dessin.'
                  : 'La galerie est bientôt pleine.'}{' '}
                Faire de la place en retirant les {CLEANUP_COUNT} plus anciens ?
              </p>
              <Button variant="secondary" block onClick={() => void cleanup()}>
                Supprimer les {CLEANUP_COUNT} plus anciens
              </Button>
            </Card>
          )}
          <ul className="gallery" aria-label="Dessins">
            {drawings.map((d) => (
              <Thumb
                key={d.id}
                drawing={d}
                names={namesOf(d, players)}
                onOpen={() => setOpenId(d.id)}
              />
            ))}
          </ul>
        </>
      )}
      {open && (
        <Viewer drawing={open} names={namesOf(open, players)} onClose={() => setOpenId(null)} />
      )}
      {confirmDialog}
    </main>
  );
}
