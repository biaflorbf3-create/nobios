import { useFinance } from '../../data/hooks/useSnapshot';
import { formatLong } from '../../lib/dates';
import { Logo } from '../../ui/Logo';
import { ThemeToggle } from '../../ui/ThemeToggle';
import type { Section } from '../router';
import { NAV, SETTINGS, type NavItem } from './nav';
import { NewMenu } from './NewMenu';

export function Sidebar({ route }: { route: Section }) {
  const data = useFinance();
  return (
    <aside className="glass fixed inset-y-3 left-3 hidden w-[240px] flex-col rounded-[28px] shadow-card lg:flex">
      <a href="#painel" className="flex items-center px-5 pt-6 pb-5" aria-label="Nobios · início">
        <Logo size={44} />
      </a>

      <div className="px-4 pb-5">
        <NewMenu variant="sidebar" />
      </div>

      <nav aria-label="Principal" className="flex flex-col gap-1 px-3">
        {NAV.map((item) => (
          <SideLink key={item.route} item={item} active={route === item.route} />
        ))}
        <SideLink item={SETTINGS} active={route === SETTINGS.route} />
      </nav>

      <div className="mt-auto space-y-3 px-4 pb-5">
        {data && (
          <div className="rounded-[20px] bg-cream/70 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-muted">O grande dia</div>
            <div className="mt-1 text-[13.5px] font-semibold">{formatLong(data.snapshot.wedding.weddingDate)}</div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="num text-[28px] font-bold leading-none tracking-[-0.02em] text-accent">{data.finance.daysToWedding}</span>
              <span className="text-[12.5px] text-ink-muted">dias restantes</span>
            </div>
          </div>
        )}
        <ThemeToggle />
      </div>
    </aside>
  );
}

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <a
      href={`#${item.route}`}
      aria-current={active ? 'page' : undefined}
      className={`group flex items-center gap-3 rounded-full px-4 py-2.5 text-[14px] font-medium transition-colors ${
        active ? 'bg-accent-soft font-semibold text-accent' : 'text-ink-soft hover:bg-cream hover:text-ink'
      }`}
    >
      <Icon size={18} strokeWidth={active ? 2 : 1.6} className={active ? 'text-accent' : 'text-ink-muted group-hover:text-ink'} aria-hidden />
      {item.label}
    </a>
  );
}
