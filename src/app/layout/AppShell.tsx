import type { ReactNode } from 'react';
import { Logo } from '../../ui/Logo';
import { ThemeToggle } from '../../ui/ThemeToggle';
import type { Section } from '../router';
import { MobileTabBar } from './MobileTabBar';
import { Sidebar } from './Sidebar';

export function AppShell({ route, children }: { route: Section; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar route={route} />
      {/* topo compacto no celular */}
      <header className="sticky top-0 z-20 flex items-center gap-2.5 bg-paper/40 px-3 pb-2.5 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
        <a href="#painel" aria-label="Nobios · início">
          <Logo size={34} compact />
        </a>
        <div className="ml-auto flex items-center">
          <ThemeToggle compact />
          <a href="#ajustes" className="rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-muted hover:bg-cream">
            Ajustes
          </a>
        </div>
      </header>
      <main className="px-3 pt-3 pb-[calc(150px+env(safe-area-inset-bottom))] sm:px-6 lg:ml-[256px] lg:px-8 lg:pt-8 lg:pb-12">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
      <MobileTabBar route={route} />
    </div>
  );
}
