import type { Section } from '../router';
import { NAV } from './nav';
import { NewMenu } from './NewMenu';

/** Barra inferior no celular: 4 destinos + o "+ Novo" no centro */
export function MobileTabBar({ route }: { route: Section }) {
  const [a, b, c, d] = NAV;
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 bg-surface/95 backdrop-blur-xl dark:bg-[#1B1527]/95 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.07)] grid grid-cols-5 items-end rounded-t-[24px] px-1 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgb(0_0_0/0.12)] lg:hidden"
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
