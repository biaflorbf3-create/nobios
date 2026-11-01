import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { Snapshot } from '../../domain/types';
import { useToast } from '../../ui/Toast';
import { dataSource } from '../sources';
import { SNAPSHOT_KEY } from './useSnapshot';

/**
 * Executa uma gravação (via repositórios) e atualiza o cache com o novo estado.
 * Com dados no GitHub: avisa "Salvando…" se demorar, e depois recarrega em segundo plano
 * para trazer qualquer coisa que a outra pessoa tenha gravado.
 */
export function useMutate() {
  const qc = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (fn: () => Promise<Snapshot>, success?: string): Promise<Snapshot | null> => {
      setPending(true);
      const slow = dataSource.kind === 'http' ? window.setTimeout(() => toast('Salvando no GitHub…'), 600) : 0;
      try {
        const next = await fn();
        qc.setQueryData(SNAPSHOT_KEY, next);
        if (success) toast(success);
        if (dataSource.kind === 'http') window.setTimeout(() => qc.invalidateQueries({ queryKey: SNAPSHOT_KEY }), 1500);
        return next;
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Não foi possível salvar.');
        return null;
      } finally {
        window.clearTimeout(slow);
        setPending(false);
      }
    },
    [qc, toast],
  );

  return { run, pending };
}
