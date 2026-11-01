import type { Snapshot } from '../../domain/types';
import { applyChanges, type Change, type DataSource } from '../DataSource';

const CACHE_MS = 15_000;

/**
 * Dados no GitHub, via Netlify Functions (/api/snapshot e /api/commit).
 * Mantém um cache curto para que validações dos repositórios (ex.: "parcela tem pagamento?")
 * não façam uma chamada de rede cada uma.
 */
export class HttpDataSource implements DataSource {
  readonly kind = 'http' as const;
  private cache: Snapshot | null = null;
  private loadedAt = 0;
  private inflight: Promise<Snapshot> | null = null;

  private base: string;

  constructor(base = '/api') {
    this.base = base;
  }

  async load(opts: { fresh?: boolean } = {}): Promise<Snapshot> {
    if (!opts.fresh && this.cache && Date.now() - this.loadedAt < CACHE_MS) return structuredClone(this.cache);
    if (!this.inflight) {
      this.inflight = (async () => {
        const res = await fetch(`${this.base}/snapshot`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
        const body = await readJson(res);
        if (!res.ok) throw new Error(body.error ?? `Não foi possível carregar os dados (${res.status}).`);
        this.cache = body.snapshot as Snapshot;
        this.loadedAt = Date.now();
        return this.cache;
      })().finally(() => {
        this.inflight = null;
      });
    }
    return structuredClone(await this.inflight);
  }

  async commit(changes: Change[], message: string): Promise<Snapshot> {
    const current = await this.load();
    const res = await fetch(`${this.base}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes, message }),
    });
    const body = await readJson(res);
    if (!res.ok) throw new Error(body.error ?? `Não foi possível salvar (${res.status}).`);
    // aplica localmente para a tela responder na hora; o app recarrega do GitHub em seguida
    this.cache = applyChanges(current, changes);
    this.loadedAt = Date.now();
    return structuredClone(this.cache);
  }
}

async function readJson(res: Response): Promise<{ error?: string; snapshot?: unknown; sha?: string }> {
  try {
    return await res.json();
  } catch {
    return { error: res.ok ? undefined : `Resposta inesperada do servidor (${res.status}).` };
  }
}
