import type { Section } from '../router';
import { NAV } from './nav';
import { NewMenu } from './NewMenu';

/** Barra inferior no celular: as 5 seções + o "+ Novo" flutuando logo acima, à direita */
export function MobileTabBar({ route }: { route: Section }) {
  return (
    <>
      <div className="fixed right-4 bottom-[calc(76px+max(10px,env(safe-area-inset-bottom)))] z-40 lg:hidden">
        <NewMenu variant="fab" />
      </div>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 rounded-t-[24px] bg-surface/95 px-1 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgb(0_0_0/0.12)] backdrop-blur-xl dark:bg-[#1B1527]/95 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.07)] lg:hidden"
      >
        {NAV.map((item) => (
          <Tab key={item.route} item={item} active={route === item.route} />
        ))}
      </nav>
    </>
  );
}

function Tab({ item, active }: { item: (typeof NAV)[number]; active: boolean }) {
  const Icon = item.icon;
  return (
    <a
      href={`#${item.route}`}
      aria-current={active ? 'page' : undefined}
      className={`flex min-w-0 flex-col items-center gap-1 py-1 text-[10px] tracking-[-0.01em] min-[400px]:text-[10.5px] ${active ? 'font-semibold text-accent' : 'text-ink-muted'}`}
    >
      <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? 'bg-accent-soft' : ''}`}>
        <Icon size={20} strokeWidth={active ? 2 : 1.6} aria-hidden />
      </span>
      <span className="max-w-full truncate">{item.label}</span>
    </a>
  );
}
