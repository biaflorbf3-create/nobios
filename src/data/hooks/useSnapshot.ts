import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { buildFinance, type Finance } from '../../domain/finance';
import type { Snapshot } from '../../domain/types';
import { todayISO } from '../../lib/dates';
import { dataSource } from '../sources';

export const SNAPSHOT_KEY = ['snapshot'] as const;
const remote = dataSource.kind === 'http';

export function useSnapshot() {
  return useQuery({
    queryKey: SNAPSHOT_KEY,
    queryFn: () => dataSource.load({ fresh: true }),
    // com dados no GitHub: ao voltar para a aba, busca o que a outra pessoa gravou
    staleTime: remote ? 30_000 : Infinity,
    refetchOnWindowFocus: remote,
    refetchInterval: remote ? 5 * 60_000 : false,
    retry: remote ? 2 : 0,
  });
}

/** Snapshot + todos os números derivados, calculados uma vez por mudança de dados */
export function useFinance(): { snapshot: Snapshot; finance: Finance } | null {
  const { data } = useSnapshot();
  const today = todayISO();
  return useMemo(() => (data ? { snapshot: data, finance: buildFinance(data, today) } : null), [data, today]);
}
