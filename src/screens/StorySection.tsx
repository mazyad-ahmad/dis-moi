import { useRecording } from '../audio/recording';
import { Card } from '../components/Card';
import { IconPause, IconPlay, IconTrash } from '../components/icons';
import { useConfirm } from '../components/useConfirm';
import type { Story } from '../data/db';
import { deleteStory, MAX_STORIES, useStories } from '../data/stories';
import { dayLabel } from '../games/format';
import { capitalize, storyTitle } from '../games/histoire/histoire';

/** Une histoire du livre : la réécouter ou la supprimer. */
function StoryRow({ story }: { story: Story }) {
  const [confirmDialog, confirm] = useConfirm();
  const { playing, failed, toggle } = useRecording(story.audio);
  const title = storyTitle(story.parts);

  return (
    <li>
      <Card className="item-row">
        <span aria-hidden="true">{story.parts.map((p) => p.emoji).join(' ')}</span>
        <span className="item-row__text">
          <strong>{title}</strong>
          <br />
          <span className="muted">
            {failed ? 'Lecture impossible, réessaie.' : capitalize(dayLabel(story.createdAt))}
          </span>
        </span>
        <button
          type="button"
          className="icon-btn icon-btn--plain"
          aria-label={playing ? `Arrêter l’histoire : ${title}` : `Écouter l’histoire : ${title}`}
          onClick={toggle}
        >
          {playing ? <IconPause size={20} /> : <IconPlay size={20} />}
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--plain"
          aria-label={`Supprimer l’histoire : ${title}`}
          onClick={async () => {
            const ok = await confirm({
              title: 'Supprimer cette histoire ?',
              message: `« ${title} » sera effacée de ce téléphone.`,
              confirmLabel: 'Supprimer',
              danger: true,
            });
            if (ok) await deleteStory(story.id);
          }}
        >
          <IconTrash size={20} />
        </button>
      </Card>
      {confirmDialog}
    </li>
  );
}

/**
 * Livre d'histoires (#68) dans l'espace Parent : les histoires enregistrées dans « Histoire à
 * inventer », la plus récente d'abord. Elles restent sur le téléphone.
 */
export function StorySection() {
  const stories = useStories();
  if (!stories) return null;
  return (
    <section className="setting" aria-labelledby="story-book-title">
      <h2 id="story-book-title" className="eyebrow">
        Livre d’histoires
      </h2>
      {stories.length > 0 ? (
        <ul className="catalogue__list" aria-label="Histoires enregistrées">
          {stories.map((s) => (
            <StoryRow key={s.id} story={s} />
          ))}
        </ul>
      ) : (
        <p className="muted">
          Pas encore d’histoire. Dans « Histoire à inventer », « Enregistrer l’histoire » la garde
          ici.
        </p>
      )}
      <p className="muted">
        Jusqu’à {MAX_STORIES} histoires, gardées sur ce téléphone seulement (ni envoyées, ni dans la
        sauvegarde).
      </p>
    </section>
  );
}
