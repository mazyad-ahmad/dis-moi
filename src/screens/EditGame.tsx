import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { href, navigate } from '../app/router';
import { useRecording } from '../audio/recording';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useConfirm } from '../components/useConfirm';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  IconCamera,
  IconMic,
  IconPencil,
  IconPlay,
  IconShare,
  IconStop,
  IconTrash,
} from '../components/icons';
import {
  addItem,
  cleanItem,
  customRouteId,
  CustomGameError,
  deleteCustomGame,
  MAX_GAME_NAME,
  MAX_ITEMS,
  MAX_PROLONGER,
  MAX_TEXT,
  removeItem,
  renameCustomGame,
  setCustomGameShadow,
  updateItem,
  useCustomGame,
} from '../data/customGames';
import type { CustomGame } from '../data/db';
import { shareGame } from '../data/gameFile';
import {
  canRecord,
  MAX_RECORD_SECONDS,
  PhotoError,
  preparePhoto,
  useRecorder,
} from '../data/media';
import { kindLabel, type DeckItem, type DeckKind } from '../games/deck/types';
import { useObjectUrl } from '../games/deck/useObjectUrl';
import { NotFound } from './Placeholder';

/** Libellés des champs selon le type de jeu. */
const LABELS: Record<DeckKind, { text?: string; answer: string; placeholder: string }> = {
  question: { text: 'Question', answer: 'Réponse', placeholder: 'Ex. : Qui dit « meuh » ?' },
  image: { text: 'Texte à montrer (si pas de photo)', answer: 'Réponse', placeholder: 'Ex. : 🍎' },
  sound: {
    text: 'Bruit à imiter (si pas d’enregistrement)',
    answer: 'Réponse',
    placeholder: 'Ex. : Vroum !',
  },
  draw: { answer: 'Mot à dessiner', placeholder: '' },
};

function Photo({ blob }: { blob: Blob }) {
  const url = useObjectUrl(blob);
  return url ? <img className="item-thumb" src={url} alt="" /> : null;
}

/**
 * Choix d'une photo (galerie ou appareil photo, au choix d'Android). Un vrai bouton ouvre le
 * sélecteur dans le geste même du parent ; le champ fichier est vidé après chaque choix pour
 * qu'une même photo puisse être reprise. Tout échec est dit, jamais avalé.
 */
function PhotoPicker({
  image,
  onChange,
  onBusy,
}: {
  image?: Blob;
  onChange: (image?: Blob) => void;
  onBusy: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function open() {
    setError('');
    const el = input.current;
    if (!el) return;
    try {
      el.click(); // appel direct dans le clic : Android n'ouvre le sélecteur que pendant un geste
    } catch {
      setError('Impossible d’ouvrir les photos de ce téléphone.');
    }
  }

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = ''; // la même photo pourra être choisie de nouveau
    if (!file) return;
    setError('');
    setBusy(true);
    onBusy(true);
    try {
      onChange(await preparePhoto(file));
    } catch (err) {
      setError(
        err instanceof PhotoError ? err.message : 'Impossible de préparer cette photo. Réessaie.',
      );
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  return (
    <div className="media-row">
      {image && <Photo blob={image} />}
      <Button
        variant="secondary"
        icon={<IconCamera size={20} />}
        onClick={open}
        disabled={busy}
        aria-describedby={error ? errorId : undefined}
      >
        {image ? 'Changer la photo' : 'Ajouter une photo'}
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Photo de la carte"
        onChange={(e) => void onPick(e)}
      />
      {image && !busy && (
        <button type="button" className="link-btn" onClick={() => onChange(undefined)}>
          Retirer la photo
        </button>
      )}
      <span className="muted" role="status">
        {busy && 'Préparation de la photo…'}
      </span>
      {error && (
        <p id={errorId} className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Recorder({ audio, onChange }: { audio?: Blob; onChange: (a?: Blob) => void }) {
  const { state, start, stop } = useRecorder(onChange);
  const listen = useRecording(audio);
  if (!canRecord())
    return <p className="muted">L’enregistrement n’est pas disponible sur cet appareil.</p>;
  return (
    <div className="media-row">
      {state === 'recording' ? (
        <Button variant="danger" icon={<IconStop size={18} />} onClick={stop}>
          Arrêter
        </Button>
      ) : (
        <Button variant="secondary" icon={<IconMic size={20} />} onClick={() => void start()}>
          {audio ? 'Réenregistrer' : 'Enregistrer un son'}
        </Button>
      )}
      {audio && state !== 'recording' && (
        <>
          <Button
            variant="secondary"
            icon={listen.playing ? <IconStop size={18} /> : <IconPlay size={18} />}
            onClick={listen.toggle}
            aria-label={listen.playing ? 'Arrêter le son enregistré' : 'Écouter le son enregistré'}
          >
            {listen.playing ? 'Arrêter' : 'Écouter'}
          </Button>
          <button type="button" className="link-btn" onClick={() => onChange(undefined)}>
            Retirer le son
          </button>
        </>
      )}
      <span className="muted" role="status">
        {state === 'recording' && `Enregistrement… (${MAX_RECORD_SECONDS} s maximum)`}
        {state === 'denied' && 'Autorise le micro pour enregistrer un son.'}
        {state === 'idle' &&
          listen.failed &&
          'Le son ne s’est pas lancé. Réessaie, ou réenregistre-le.'}
      </span>
    </div>
  );
}

/** Message clair quand une carte ne peut pas être écrite dans la base. */
function saveErrorMessage(err: unknown): string {
  if (err instanceof CustomGameError) return err.message;
  const name = (e: unknown) => (e instanceof Error || e instanceof DOMException ? e.name : '');
  const inner = (err as { inner?: unknown } | null)?.inner; // erreur d'origine, sous Dexie
  if ([name(err), name(inner)].includes('QuotaExceededError'))
    return 'Plus assez de place sur ce téléphone pour enregistrer la carte. Libère de la place ou retire la photo.';
  return 'Impossible d’enregistrer la carte. Réessaie.';
}

function ItemForm({
  kind,
  initial,
  onSave,
  onCancel,
}: {
  kind: DeckKind;
  initial?: DeckItem;
  onSave: (item: DeckItem) => Promise<void>;
  onCancel?: () => void;
}) {
  const empty: DeckItem = { answer: '' };
  const [item, setItem] = useState<DeckItem>(initial ?? empty);
  const [error, setError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const labels = LABELS[kind];
  const set = (patch: Partial<DeckItem>) => setItem((it) => ({ ...it, ...patch }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (photoBusy) return; // la photo choisie n'est pas encore prête
    setError('');
    try {
      cleanItem(kind, item); // message d'erreur clair avant d'écrire
      await onSave(item);
      setItem(empty);
    } catch (err) {
      setError(saveErrorMessage(err));
    }
  }

  return (
    <form
      className="item-form"
      onSubmit={onSubmit}
      aria-label={initial ? 'Modifier la carte' : 'Nouvelle carte'}
    >
      {kind === 'image' && (
        <PhotoPicker
          image={item.image}
          onChange={(image) => set({ image })}
          onBusy={setPhotoBusy}
        />
      )}
      {kind === 'sound' && <Recorder audio={item.audio} onChange={(audio) => set({ audio })} />}

      {labels.text && (
        <label className="field-label">
          {labels.text}
          <input
            className="field"
            maxLength={MAX_TEXT}
            placeholder={labels.placeholder}
            value={item.text ?? ''}
            onChange={(e) => set({ text: e.target.value })}
          />
        </label>
      )}
      <label className="field-label">
        {labels.answer}
        <input
          className="field"
          maxLength={MAX_TEXT}
          value={item.answer}
          onChange={(e) => set({ answer: e.target.value })}
        />
      </label>
      {kind !== 'draw' && (
        <label className="field-label">
          Indice (facultatif)
          <input
            className="field"
            maxLength={MAX_TEXT}
            value={item.hint ?? ''}
            onChange={(e) => set({ hint: e.target.value })}
          />
        </label>
      )}
      {kind !== 'draw' && (
        <label className="field-label">
          Pour prolonger (facultatif)
          <input
            className="field"
            maxLength={MAX_PROLONGER}
            placeholder="Ex. : Cherchez quelque chose de rouge autour de vous"
            value={item.prolonger ?? ''}
            onChange={(e) => set({ prolonger: e.target.value })}
          />
        </label>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {onCancel ? (
        <div className="answer-bar">
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" disabled={photoBusy}>
            Enregistrer
          </Button>
        </div>
      ) : (
        <Button type="submit" block disabled={photoBusy}>
          Ajouter la carte
        </Button>
      )}
    </form>
  );
}

function ItemRow({ game, index, onEdit }: { game: CustomGame; index: number; onEdit: () => void }) {
  const item = game.items[index];
  const [confirmDialog, confirm] = useConfirm();
  return (
    <li>
      <Card className="item-row">
        {item.image && <Photo blob={item.image} />}
        {item.audio && <IconMic aria-label="Son enregistré" />}
        <span className="item-row__text">
          {item.text && game.kind !== 'draw' && <span className="muted">{item.text}</span>}
          <strong>{item.answer}</strong>
        </span>
        <button
          type="button"
          className="icon-btn icon-btn--plain"
          aria-label={`Modifier ${item.answer}`}
          onClick={onEdit}
        >
          <IconPencil size={20} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--plain"
          aria-label={`Supprimer ${item.answer}`}
          onClick={async () => {
            const ok = await confirm({
              title: `Supprimer la carte « ${item.answer} » ?`,
              confirmLabel: 'Supprimer la carte',
              danger: true,
            });
            if (ok) await removeItem(game.id, index);
          }}
        >
          <IconTrash size={20} />
        </button>
      </Card>
      {confirmDialog}
    </li>
  );
}

function NameField({ game }: { game: CustomGame }) {
  const [name, setName] = useState(game.name);
  const [error, setError] = useState('');
  async function commit() {
    if (name === game.name) return;
    try {
      await renameCustomGame(game.id, name);
      setError('');
    } catch (e) {
      setName(game.name);
      setError(e instanceof CustomGameError ? e.message : 'Impossible de renommer.');
    }
  }
  return (
    <label className="field-label">
      Nom du jeu
      <input
        className="field"
        value={name}
        maxLength={MAX_GAME_NAME}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

function ExportButton({ game }: { game: CustomGame }) {
  const [status, setStatus] = useState('');
  async function onClick() {
    setStatus('');
    try {
      const result = await shareGame(game);
      if (result === 'downloaded')
        setStatus('Fichier enregistré dans les téléchargements du téléphone.');
    } catch {
      setStatus('Impossible de préparer le fichier.');
    }
  }
  return (
    <>
      <Button
        variant="secondary"
        block
        icon={<IconShare size={20} />}
        onClick={() => void onClick()}
      >
        Partager le jeu (fichier)
      </Button>
      <p className="muted" role="status">
        {status}
      </p>
    </>
  );
}

/** Ombres (#61), jeux Image : montrer les images telles quelles ou dans l'ombre. */
function ShadowChoice({ game }: { game: CustomGame }) {
  const options = [
    { value: false, label: 'Telles quelles' },
    { value: true, label: 'En ombres' },
  ];
  return (
    <>
      <span className="field-label" id="shadow-label">
        Montrer les images
      </span>
      <div className="chips" role="radiogroup" aria-labelledby="shadow-label">
        {options.map((o) => (
          <label key={o.label} className="chip">
            <input
              type="radio"
              name="shadow"
              checked={!!game.shadow === o.value}
              onChange={() => void setCustomGameShadow(game.id, o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
      <p className="muted">
        En ombres : l’enfant devine l’image cachée (emoji en silhouette, photo assombrie), qui
        apparaît en couleur avec « Voir la réponse ».
      </p>
    </>
  );
}

function Editor({ game }: { game: CustomGame }) {
  const [editing, setEditing] = useState<number | null>(null);
  const full = game.items.length >= MAX_ITEMS;
  const [confirmDialog, confirm] = useConfirm();

  return (
    <main className="screen">
      <ScreenHeader title={game.name} back="/ajouter" />
      <NameField key={game.name} game={game} />
      <p className="muted">
        Type : {kindLabel(game.kind)}. Une carte = une manche ; les photos et les sons restent sur
        ce téléphone.
      </p>
      {game.kind === 'image' && <ShadowChoice game={game} />}

      <section aria-labelledby="cards-title" className="catalogue">
        <h2 id="cards-title" className="eyebrow">
          {game.items.length} {game.items.length > 1 ? 'cartes' : 'carte'}
        </h2>
        {game.items.length > 0 && (
          <ul className="catalogue__list">
            {game.items.map((_, i) =>
              editing === i ? (
                <li key={i}>
                  <ItemForm
                    kind={game.kind}
                    initial={game.items[i]}
                    onCancel={() => setEditing(null)}
                    onSave={async (it) => {
                      await updateItem(game.id, i, it);
                      setEditing(null);
                    }}
                  />
                </li>
              ) : (
                <ItemRow key={i} game={game} index={i} onEdit={() => setEditing(i)} />
              ),
            )}
          </ul>
        )}
      </section>

      {editing === null &&
        (full ? (
          <p className="muted">{MAX_ITEMS} cartes maximum.</p>
        ) : (
          <ItemForm kind={game.kind} onSave={(it) => addItem(game.id, it)} />
        ))}

      {game.items.length > 0 ? (
        <a className="btn btn--primary btn--block" href={href(`/jeu/${customRouteId(game.id)}`)}>
          Jouer
        </a>
      ) : (
        <Button block disabled>
          Jouer
        </Button>
      )}
      {game.items.length > 0 && <ExportButton game={game} />}
      <Button
        variant="danger"
        block
        onClick={async () => {
          const ok = await confirm({
            title: `Supprimer le jeu « ${game.name} » ?`,
            message: 'Toutes ses cartes seront supprimées.',
            confirmLabel: 'Supprimer le jeu',
            danger: true,
          });
          if (!ok) return;
          await deleteCustomGame(game.id);
          navigate('/ajouter');
        }}
      >
        Supprimer le jeu
      </Button>
      {confirmDialog}
    </main>
  );
}

export function EditGame({ id }: { id: number }) {
  const game = useCustomGame(id);
  if (game === undefined) return <main className="screen" />;
  if (game === null) return <NotFound />;
  return <Editor game={game} />;
}
