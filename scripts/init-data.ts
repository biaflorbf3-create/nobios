/**
 * Gera a pasta data/ (um arquivo JSON por registro) para o repositório do GitHub.
 *
 *   npm run data:init            → casamento + categorias + pessoas, sem fornecedores (começar do zero)
 *   npm run data:init -- --exemplo → os dados fictícios usados na validação
 *
 * Não sobrescreve uma pasta data/ que já tenha dados, a menos que use --forcar.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSeed } from '../src/data/mock/seed';
import type { Snapshot } from '../src/domain/types';
import { reais } from '../src/lib/money';

const COLLECTIONS = ['categories', 'suppliers', 'quotes', 'contracts', 'installments', 'payments', 'people', 'users'] as const;

/** Snapshot → { "data/categories/cat_buffet.json": "…" } */
export function snapshotToFiles(s: Snapshot, dir = 'data'): Record<string, string> {
  const files: Record<string, string> = {};
  const write = (path: string, v: unknown) => (files[path] = `${JSON.stringify(v, null, 2)}\n`);
  write(`${dir}/wedding/wedding.json`, s.wedding);
  for (const c of COLLECTIONS) for (const r of s[c] as { id: string }[]) write(`${dir}/${c}/${r.id}.json`, r);
  return files;
}

/** Começar do zero: mantém casamento, categorias (sem valores planejados) e pessoas */
export function emptySnapshot(): Snapshot {
  const seed = createSeed();
  const now = new Date().toISOString();
  return {
    wedding: { ...seed.wedding, coupleName: 'Bia e Vini', totalBudget: reais(80000), createdAt: now, updatedAt: now },
    categories: seed.categories.map((c) => ({ ...c, plannedBudget: null, need: c.need === 'dismissed' ? 'optional' : c.need, createdAt: now, updatedAt: now })),
    suppliers: [],
    quotes: [],
    contracts: [],
    installments: [],
    payments: [],
    people: seed.people,
    users: [],
  };
}

function main() {
  const args = process.argv.slice(2);
  const example = args.includes('--exemplo');
  const force = args.includes('--forcar');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const target = join(root, 'data');
  if (existsSync(target) && readdirSync(target).length && !force) {
    console.error('A pasta data/ já tem conteúdo. Use --forcar para substituir.');
    process.exit(1);
  }
  if (force) rmSync(target, { recursive: true, force: true });
  const files = snapshotToFiles(example ? createSeed() : emptySnapshot());
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  console.log(`${Object.keys(files).length} arquivos gerados em data/ (${example ? 'dados de exemplo' : 'começando do zero'}).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
