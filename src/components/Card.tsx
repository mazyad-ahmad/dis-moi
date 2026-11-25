import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

/** Surface « paper » posée sur « mist ». `raised` ajoute shadow-soft. */
export function Card({ raised, className, ...rest }: Props) {
  return (
    <div
      className={['card', raised && 'card--raised', className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
