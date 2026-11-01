import type { Snapshot } from '../../domain/types';
import type { AnyRecord, DataSource } from '../DataSource';

type Collection = Exclude<keyof Snapshot, 'wedding'>;
type Item<C extends Collection> = Snapshot[C][number];

/**
 * Repositório tipado por coleção. O resto do app fala com repositórios,
 * nunca com o DataSource diretamente.
 */
export function createRepository<C extends Collection>(source: DataSource, entity: C) {
  return {
    async list(): Promise<Item<C>[]> {
      return (await source.load())[entity] as Item<C>[];
    },
    async get(id: string): Promise<Item<C> | undefined> {
      return ((await source.load())[entity] as Item<C>[]).find((r) => (r as { id: string }).id === id);
    },
    save(record: Item<C>, message = `Salvar ${entity}`) {
      return source.commit([{ op: 'put', entity, record: record as unknown as AnyRecord }], message);
    },
    remove(id: string, message = `Excluir ${entity}`) {
      return source.commit([{ op: 'delete', entity, id }], message);
    },
  };
}
