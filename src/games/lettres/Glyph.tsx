import type { GlyphSet } from './bank';

/** Points du dé, dans un carré de 100 : les dispositions habituelles de 1 à 6. */
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 24],
    [72, 24],
    [28, 50],
    [72, 50],
    [28, 76],
    [72, 76],
  ],
};

function Dice({ n }: { n: number }) {
  return (
    <svg className="constellation" viewBox="0 0 100 100" aria-hidden="true">
      <rect className="constellation__face" x="5" y="5" width="90" height="90" rx="18" />
      {(PIPS[n] ?? []).map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} className="constellation__dot" cx={cx} cy={cy} r="9" />
      ))}
    </svg>
  );
}

/** Index, majeur, annulaire, auriculaire : position et hauteur du bout levé. */
const FINGER_TIPS = [
  { x: 28, top: 16 },
  { x: 43, top: 6 },
  { x: 58, top: 10 },
  { x: 73, top: 22 },
];

/**
 * Une main vue de face, `up` doigts levés (0 à 5), comptés à la française : le pouce d'abord,
 * puis l'index, le majeur… Un doigt baissé ne dépasse presque plus ; le pouce baissé est replié
 * sur la paume.
 */
function Hand({ up, mirror }: { up: number; mirror?: boolean }) {
  return (
    <g transform={mirror ? 'translate(100 0) scale(-1 1)' : undefined}>
      {FINGER_TIPS.map((f, i) => {
        const top = up > i + 1 ? f.top : 44;
        return (
          <rect key={f.x} className="hand" x={f.x} y={top} width="13" height={70 - top} rx="6.5" />
        );
      })}
      {up >= 1 && (
        <rect
          className="hand"
          x="12"
          y="44"
          width="14"
          height="44"
          rx="7"
          transform="rotate(-24 26 88)"
        />
      )}
      <rect className="hand" x="24" y="52" width="64" height="60" rx="18" />
      {up < 1 && <rect className="hand" x="28" y="72" width="40" height="15" rx="7.5" />}
    </g>
  );
}

function Fingers({ n }: { n: number }) {
  if (n <= 5)
    return (
      <svg className="constellation" viewBox="-12 0 112 120" aria-hidden="true">
        <Hand up={n} />
      </svg>
    );
  // Deux mains, pouces vers le milieu : une main pleine, l'autre avec ce qui reste.
  return (
    <svg className="constellation constellation--wide" viewBox="0 0 242 120" aria-hidden="true">
      <Hand up={5} mirror />
      <g transform="translate(142 0)">
        <Hand up={n - 5} />
      </g>
    </svg>
  );
}

/**
 * Un glyphe tel que l'enfant le voit : texte (majuscule, minuscule, attaché, chiffre, nombre)
 * ou constellation dessinée (dé, main). `className` est la classe du texte (`glyph-card__glyph`,
 * `choice__glyph`) : des variantes s'y ajoutent pour l'attaché et les nombres longs.
 */
export function GlyphView({
  glyph,
  set,
  className,
  label,
}: {
  glyph: string;
  set: GlyphSet;
  className: string;
  /** Glyphe de la carte (pas d'un choix) : nom annoncé pour une constellation, sans texte. */
  label?: string;
}) {
  const main = label ? { 'data-testid': 'glyph', 'data-glyph': glyph } : {};
  if (set === 'dice' || set === 'fingers')
    return (
      <span
        className={`${className} ${className}--shape`}
        {...main}
        {...(label && { role: 'img', 'aria-label': label })}
      >
        {set === 'dice' ? <Dice n={Number(glyph)} /> : <Fingers n={Number(glyph)} />}
      </span>
    );
  const variants = [
    set === 'cursive' && `${className}--cursive`,
    glyph.length > 1 && `${className}--len${Math.min(glyph.length, 3)}`,
  ].filter(Boolean);
  return (
    <span className={[className, ...variants].join(' ')} {...main}>
      {glyph}
    </span>
  );
}
