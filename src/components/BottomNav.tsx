import { href } from '../app/router';
import { IconGrid, IconLock, IconStar } from './icons';

export type Tab = 'home' | 'stars' | 'parent';

const TABS = [
  { id: 'home', label: 'Jeux', path: '/', Icon: IconGrid },
  { id: 'stars', label: 'Étoiles', path: '/etoiles', Icon: IconStar },
  { id: 'parent', label: 'Parent', path: '/parent', Icon: IconLock },
] as const;

export function BottomNav({ active }: { active: Tab }) {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {TABS.map(({ id, label, path, Icon }) => (
        <a
          key={id}
          href={href(path)}
          className="bottom-nav__item"
          aria-current={active === id ? 'page' : undefined}
        >
          <Icon />
          {label}
        </a>
      ))}
    </nav>
  );
}
