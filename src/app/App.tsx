import { useQueryClient } from '@tanstack/react-query';
import { RotateCw } from 'lucide-react';
import { useEffect } from 'react';
import { SNAPSHOT_KEY, useSnapshot } from '../data/hooks/useSnapshot';
import { dataSource } from '../data/sources';
import { BudgetPage } from '../features/budget/BudgetPage';
import { CategoryDetailPage } from '../features/budget/CategoryDetailPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { PaymentsPage } from '../features/payments/PaymentsPage';
import { TasksPage } from '../features/tasks/TasksPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { SupplierDetailPage } from '../features/suppliers/SupplierDetailPage';
import { SuppliersPage } from '../features/suppliers/SuppliersPage';
import { Button } from '../ui/form';
import { LogoMark } from '../ui/Logo';
import { AppShell } from './layout/AppShell';
import { sectionOf, useRoute } from './router';

export function App() {
  const route = useRoute();
  const { isPending, isError, error, refetch, isFetching, dataUpdatedAt } = useSnapshot();
  const qc = useQueryClient();

  // com dados no GitHub: ao trocar de tela, busca novidades se os dados tiverem mais de 20 s
  useEffect(() => {
    if (dataSource.kind === 'http' && dataUpdatedAt && Date.now() - dataUpdatedAt > 20_000) qc.invalidateQueries({ queryKey: SNAPSHOT_KEY });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  if (isPending) return <Splash text={dataSource.kind === 'http' ? 'Carregando os dados do GitHub…' : 'Carregando…'} />;
  if (isError)
    return (
      <Splash text="Não foi possível carregar os dados">
        <p className="mx-auto mt-2 max-w-[420px] text-[13px] leading-5 text-ink-muted">{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
        <Button variant="primary" className="mt-5" onClick={() => refetch()} disabled={isFetching}>
          <RotateCw size={14} aria-hidden /> Tentar de novo
        </Button>
      </Splash>
    );

  return (
    <AppShell route={sectionOf(route)}>
      {route.name === 'painel' ? (
        <DashboardPage />
      ) : route.name === 'pagamentos' ? (
        <PaymentsPage />
      ) : route.name === 'tarefas' ? (
        <TasksPage />
      ) : route.name === 'fornecedores' ? (
        <SuppliersPage />
      ) : route.name === 'fornecedor' ? (
        <SupplierDetailPage key={route.id} id={route.id} />
      ) : route.name === 'categoria' ? (
        <CategoryDetailPage key={route.id} id={route.id} />
      ) : route.name === 'orcamento' ? (
        <BudgetPage />
      ) : (
        <SettingsPage />
      )}
    </AppShell>
  );
}

function Splash({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <LogoMark size={64} className={children ? '' : 'animate-pulse'} />
      <div className="mt-5 text-[22px] font-bold tracking-[-0.03em]">Nobios</div>
      <p className="mt-1 text-[14px] text-ink-soft">{text}</p>
      {children}
    </div>
  );
}
