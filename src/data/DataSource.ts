import type { EntityName, Snapshot } from '../domain/types';

/** Um registro qualquer de uma coleção do Snapshot */
export type AnyRecord = { id: string } & Record<string, unknown>;

export type Change =
  | { op: 'put'; entity: EntityName; record: AnyRecord }
  | { op: 'delete'; entity: Exclude<EntityName, 'wedding'>; id: string };

/**
 * Único ponto que sabe de onde vêm os dados.
 * v1: MockDataSource (navegador) · v2: HttpDataSource → Netlify Functions → GitHub · futuro: Supabase.
 */
export interface DataSource {
  readonly kind: 'mock' | 'http';
  /** `fresh: true` ignora o cache e busca de novo (ex.: ao voltar para a aba) */
  load(opts?: { fresh?: boolean }): Promise<Snapshot>;
  /** Aplica todas as mudanças de forma atômica (um commit no GitHub) e devolve o novo estado */
  commit(changes: Change[], message: string): Promise<Snapshot>;
}

/** Aplica mudanças a um snapshot em memória — usado pelo mock e pelas atualizações otimistas */
export function applyChanges(snapshot: Snapshot, changes: Change[]): Snapshot {
  const next: Snapshot = structuredClone(snapshot);
  const now = new Date().toISOString();
  for (const ch of changes) {
    if (ch.entity === 'wedding') {
      if (ch.op === 'put') next.wedding = { ...next.wedding, ...(ch.record as object), updatedAt: now };
      continue;
    }
    const list = next[ch.entity] as unknown as AnyRecord[];
    if (ch.op === 'delete') {
      const i = list.findIndex((r) => r.id === ch.id);
      if (i >= 0) list.splice(i, 1);
    } else {
      const i = list.findIndex((r) => r.id === ch.record.id);
      const record = { ...ch.record, updatedAt: now };
      if (i >= 0) list[i] = { ...list[i], ...record };
      else list.push({ createdAt: now, ...record });
    }
  }
  return next;
}
