import type { Section } from '../router';
import { NAV } from './nav';
import { NewMenu } from './NewMenu';

/** Barra inferior no celular: 4 destinos + o "+ Novo" no centro */
export function MobileTabBar({ route }: { route: Section }) {
  const [a, b, c, d] = NAV;
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 items-end glass rounded-[26px] px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] shadow-hover lg:hidden"
    >
      {[a, b].map((item) => (
        <Tab key={item.route} item={item} active={route === item.route} />
      ))}
      <div className="flex justify-center">
        <NewMenu variant="fab" />
      </div>
      {[c, d].map((item) => (
        <Tab key={item.route} item={item} active={route === item.route} />
      ))}
    </nav>
  );
}

function Tab({ item, active }: { item: (typeof NAV)[number]; active: boolean }) {
  const Icon = item.icon;
  return (
    <a
      href={`#${item.route}`}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-1 py-1 text-[10.5px] ${active ? 'font-semibold text-accent' : 'text-ink-muted'}`}
    >
      <Icon size={20} strokeWidth={active ? 2 : 1.6} aria-hidden />
      {item.label}
    </a>
  );
}
