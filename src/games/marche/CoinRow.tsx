import { coinShapes, TEXT } from './coins';

/** Une rangée de pièces en SVG (React), pour l'écran de jeu. */
export function CoinRow({ coins, label }: { coins: readonly number[]; label: string }) {
  const { shapes, width, height } = coinShapes(coins);
  return (
    <svg
      className="marche-coins"
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: `min(100%, ${width * 1.1}px)` }}
      role="img"
      aria-label={label}
    >
      {shapes.map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={s.y} r={s.r} fill={s.ring} stroke={s.edge} strokeWidth="2" />
          <circle cx={s.x} cy={s.y} r={s.r * 0.7} fill={s.core} />
          <text
            x={s.x}
            y={s.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={TEXT}
            fontSize={s.r * 0.62}
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
