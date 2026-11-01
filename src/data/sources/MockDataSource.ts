import type { Snapshot } from '../../domain/types';
import { applyChanges, type Change, type DataSource } from '../DataSource';
import { createSeed } from '../mock/seed';

const KEY = 'bia-vini:snapshot:v1';

/**
 * Dados fictícios guardados no navegador.
 * Serve para validar a experiência sem backend; "Restaurar dados de exemplo" volta ao seed.
 */
export class MockDataSource implements DataSource {
  readonly kind = 'mock' as const;
  private state: Snapshot | null = null;

  async load(): Promise<Snapshot> {
    if (!this.state) this.state = read() ?? createSeed();
    return structuredClone(this.state);
  }

  async commit(changes: Change[], _message?: string): Promise<Snapshot> {
    const current = await this.load();
    this.state = applyChanges(current, changes);
    write(this.state);
    return structuredClone(this.state);
  }

  async reset(): Promise<Snapshot> {
    this.state = createSeed();
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* armazenamento indisponível: segue em memória */
    }
    return structuredClone(this.state);
  }
}

function read(): Snapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

function write(s: Snapshot) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* armazenamento indisponível: segue em memória */
  }
}
