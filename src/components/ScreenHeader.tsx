import type { ReactNode } from 'react';
import { href } from '../app/router';
import { IconBack } from './icons';

interface Props {
  title: string;
  back?: string;
  children?: ReactNode;
}

export function ScreenHeader({ title, back, children }: Props) {
  return (
    <header className="screen-header">
      {back && (
        <a className="icon-btn" href={href(back)} aria-label="Retour">
          <IconBack />
        </a>
      )}
      <h1 className="screen-header__title">{title}</h1>
      {children}
    </header>
  );
}
