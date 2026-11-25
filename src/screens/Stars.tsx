import { ScreenHeader } from '../components/ScreenHeader';
import { IconStar } from '../components/icons';

export function Stars() {
  return (
    <main className="screen">
      <ScreenHeader title="Étoiles" />
      <div className="empty">
        <IconStar size={48} />
        <strong>Pas encore d'étoiles</strong>
        <span className="muted">Les étoiles gagnées pendant les parties s'afficheront ici.</span>
      </div>
    </main>
  );
}
