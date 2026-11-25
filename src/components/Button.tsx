import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  icon?: ReactNode;
}

/** Bouton pilule (radius-full), hauteur tactile ≥ 48 px. */
export function Button({ variant = 'primary', block, icon, className, children, ...rest }: Props) {
  const cls = ['btn', `btn--${variant}`, block && 'btn--block', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={cls} {...rest}>
      {icon}
      {children}
    </button>
  );
}
