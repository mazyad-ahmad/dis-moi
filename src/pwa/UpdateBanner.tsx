import { Button } from '../components/Button';
import { applyUpdate, usePwa } from './pwa';

/** Bandeau « Nouvelle version » : la mise à jour n'interrompt jamais une partie sans action du parent. */
export function UpdateBanner() {
  const { waiting } = usePwa();
  if (!waiting) return null;
  return (
    <div className="update-banner" role="status">
      <span>Une nouvelle version de Dis&#8209;moi est prête.</span>
      <Button variant="secondary" onClick={applyUpdate}>
        Mettre à jour
      </Button>
    </div>
  );
}
