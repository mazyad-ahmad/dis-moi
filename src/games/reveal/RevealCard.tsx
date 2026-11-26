import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import type { DeckItem } from '../deck/types';
import { useObjectUrl } from '../deck/useObjectUrl';
import { blurOf, pixelHeight, pixelWidth, REVEAL_STEPS } from './reveal';
import './reveal.css';

/** Photo décodée une seule fois ; `null` tant qu'elle n'est pas prête. */
function useDecodedImage(url: string | undefined): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (alive) setImg(image);
    };
    image.src = url;
    return () => {
      alive = false;
      image.onload = null;
    };
  }, [url]);
  return img;
}

/**
 * Photo pixelisée : réduite à quelques carrés dans une petite toile, que le navigateur agrandit
 * sans lissage (CSS `image-rendering: pixelated`). Au dernier palier, la photo elle-même.
 */
function PixelPhoto({ blob, step }: { blob: Blob; step: number }) {
  const url = useObjectUrl(blob);
  const img = useDecodedImage(url);
  const canvas = useRef<HTMLCanvasElement>(null);
  const width = pixelWidth(step);

  useLayoutEffect(() => {
    const c = canvas.current;
    if (!c || !img || width === undefined) return;
    c.width = width;
    c.height = pixelHeight(width, img.naturalWidth, img.naturalHeight);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
  }, [img, width]);

  if (width === undefined)
    return url ? (
      <img className="deck-card__photo reveal__frame" src={url} alt="Image à deviner, nette" />
    ) : null;
  return (
    <canvas
      ref={canvas}
      className="deck-card__photo reveal__frame reveal__pixels"
      data-width={width}
      role="img"
      aria-label="Image à deviner, encore cachée"
    />
  );
}

/**
 * Carte Image en « Image cachée » (#62) : l'image démarre méconnaissable et se précise par
 * paliers, d'un appui du parent sur « Préciser l'image ». Rien d'animé entre deux paliers.
 */
export function RevealCard({ item }: { item: DeckItem }) {
  const [step, setStep] = useState(0);
  const last = REVEAL_STEPS - 1;
  const sharp = step >= last;
  const blur = blurOf(step);
  return (
    <>
      <figure className="deck-card deck-card--image reveal">
        {item.image ? (
          <PixelPhoto blob={item.image} step={step} />
        ) : (
          <span
            className="deck-card__emoji reveal__emoji"
            role="img"
            aria-label={sharp ? 'Image à deviner, nette' : 'Image à deviner, encore cachée'}
            style={blur ? { filter: `blur(${blur}px)` } : undefined}
          >
            {item.emoji}
          </span>
        )}
        {/* Le texte de la carte pourrait donner la réponse : il vient avec l'image nette. */}
        {sharp && item.text && <strong className="deck-card__text">{item.text}</strong>}
        <figcaption className="muted">Montre l'écran à l'enfant</figcaption>
      </figure>
      <div className="reveal__bar">
        <span className="reveal__step" role="status">
          {sharp ? 'Image nette' : `Palier ${step + 1} sur ${REVEAL_STEPS}`}
        </span>
        {!sharp && (
          <Button variant="secondary" onClick={() => setStep((s) => Math.min(s + 1, last))}>
            Préciser l’image
          </Button>
        )}
      </div>
    </>
  );
}
