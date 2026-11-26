export type MascotMood = 'hello' | 'think' | 'bravo' | 'sleep';

interface Props {
  mood: MascotMood;
  /** Côté, en px. */
  size?: number;
}

/** Yeux ouverts, qui clignent (sauf avec « réduire les animations »). */
function OpenEyes({ dx = 0, dy = 0 }: { dx?: number; dy?: number }) {
  return (
    <g className="mascot__eyes" fill="var(--ink)">
      <circle cx={39 + dx} cy={44 + dy} r="4" />
      <circle cx={61 + dx} cy={44 + dy} r="4" />
    </g>
  );
}

function Face({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'hello':
      return (
        <>
          <OpenEyes />
          <path d="M42 56q8 8 16 0" />
          <g className="mascot__wave">
            <path d="M82 56q8-6 6-16" />
            <circle cx="88" cy="36" r="5" fill="var(--meadow)" />
          </g>
        </>
      );
    case 'think':
      return (
        <>
          <OpenEyes dx={-2} dy={-3} />
          <path d="M45 59h10" />
          <g className="mascot__dots" fill="var(--river)" stroke="none">
            <circle cx="78" cy="14" r="2.5" />
            <circle cx="86" cy="9" r="3" />
            <circle cx="95" cy="5" r="3.5" />
          </g>
        </>
      );
    case 'bravo':
      return (
        <>
          <path d="M34 46q5-6 10 0M56 46q5-6 10 0" />
          <path d="M40 55q10 13 20 0z" fill="var(--ink)" />
          <g className="mascot__sparkles" fill="var(--sun)" stroke="none">
            <path d="M88 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
            <path d="M12 22l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" />
          </g>
        </>
      );
    case 'sleep':
      return (
        <>
          <path d="M34 45q5 4 10 0M56 45q5 4 10 0" />
          <circle cx="50" cy="59" r="2.5" fill="var(--ink)" stroke="none" />
          <g
            className="mascot__z"
            fill="none"
            stroke="var(--river)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          >
            <path d="M78 22h8l-8 9h8" />
            <path d="M90 6h6l-6 7h6" />
          </g>
        </>
      );
  }
}

/**
 * Mascotte de l'appli (#36) : une petite bulle qui parle, dessinée en SVG en ligne
 * (aucune image à charger), aux couleurs du thème jour / nuit.
 * Purement décorative : cachée aux lecteurs d'écran. Elle ne bouge qu'en CSS, donc
 * reste immobile avec « réduire les animations » (global.css). Jamais pendant une manche.
 */
export function Mascot({ mood, size = 72 }: Props) {
  return (
    <svg
      className={`mascot mascot--${mood}`}
      data-testid="mascot"
      data-mood={mood}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="var(--forest)"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <g className="mascot__body">
        <path
          d="M50 14A34 34 0 1 1 29.5 75.2L18 85l4.5-17A34 34 0 0 1 50 14z"
          fill="var(--meadow)"
          strokeLinejoin="round"
        />
        <g fill="var(--ember)" stroke="none" opacity="0.3">
          <circle cx="31" cy="54" r="4.5" />
          <circle cx="69" cy="54" r="4.5" />
        </g>
        <g stroke="var(--ink)" strokeWidth="2.5">
          <Face mood={mood} />
        </g>
      </g>
    </svg>
  );
}
