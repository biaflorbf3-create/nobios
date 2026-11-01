/**
 * Testa as funções do Netlify contra um GitHub falso em memória
 * (GraphQL de leitura + Git Data API de escrita, com detecção de corrida no PATCH do ref).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSeed } from '../../../src/data/mock/seed';
import { buildFinance } from '../../../src/domain/finance';
import type { Snapshot } from '../../../src/domain/types';
import { snapshotToFiles } from '../../../scripts/init-data';
import commit from '../commit';
import snapshot from '../snapshot';

type Files = Map<string, string>;

class FakeGitHub {
  trees = new Map<string, Files>();
  commits = new Map<string, { tree: string; parents: string[]; message: string }>();
  head = '';
  n = 0;
  /** chamado antes do PATCH do ref — para simular outra pessoa gravando no meio */
  beforePatch: (() => void) | null = null;

  constructor(files: Record<string, string>) {
    const t = this.saveTree(new Map(Object.entries(files)));
    this.head = this.saveCommit(t, [], 'inicial');
  }
  id(p: string) {
    return `${p}${++this.n}`.padEnd(40, '0');
  }
  saveTree(f: Files) {
    const sha = this.id('t');
    this.trees.set(sha, f);
    return sha;
  }
  saveCommit(tree: string, parents: string[], message: string) {
    const sha = this.id('c');
    this.commits.set(sha, { tree, parents, message });
    return sha;
  }
  files(commitSha = this.head) {
    return this.trees.get(this.commits.get(commitSha)!.tree)!;
  }
  /** grava diretamente (simula outra pessoa) */
  externalWrite(path: string, content: string) {
    const f = new Map(this.files());
    f.set(path, content);
    this.head = this.saveCommit(this.saveTree(f), [this.head], 'outra pessoa');
  }

  fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const ok = (v: unknown) => new Response(JSON.stringify(v), { status: 200 });
    const p = url.pathname;

    if (p === '/graphql') {
      const dir = (body.variables.expr as string).split(':')[1];
      const byFolder = new Map<string, { name: string; object: { text: string } }[]>();
      for (const [path, text] of this.files()) {
        if (!path.startsWith(`${dir}/`)) continue;
        const [, folder, file] = path.split('/');
        byFolder.set(folder, [...(byFolder.get(folder) ?? []), { name: file, object: { text } }]);
      }
      return ok({
        data: {
          repository: {
            ref: { target: { oid: this.head } },
            object: byFolder.size ? { entries: [...byFolder].map(([name, entries]) => ({ name, type: 'tree', object: { entries } })) } : null,
          },
        },
      });
    }
    if (p.endsWith('/git/ref/heads/main')) return ok({ object: { sha: this.head } });
    let m = p.match(/\/git\/commits\/(\w+)$/);
    if (m && method === 'GET') return ok({ tree: { sha: this.commits.get(m[1])!.tree } });
    m = p.match(/\/git\/trees\/(\w+)$/);
    if (m && method === 'GET') return ok({ tree: [...this.trees.get(m[1])!.keys()].map((path) => ({ path })) });
    if (p.endsWith('/git/trees') && method === 'POST') {
      const f = new Map(this.trees.get(body.base_tree)!);
      for (const e of body.tree) {
        if (e.sha === null) {
          if (!f.has(e.path)) return new Response('{"message":"tree.path not found"}', { status: 422 });
          f.delete(e.path);
        } else f.set(e.path, e.content);
      }
      return ok({ sha: this.saveTree(f) });
    }
    if (p.endsWith('/git/commits') && method === 'POST') return ok({ sha: this.saveCommit(body.tree, body.parents, body.message) });
    if (p.endsWith('/git/refs/heads/main') && method === 'PATCH') {
      this.beforePatch?.();
      this.beforePatch = null;
      const c = this.commits.get(body.sha)!;
      if (!c.parents.includes(this.head)) return new Response('{"message":"Update is not a fast forward"}', { status: 422 });
      this.head = body.sha;
      return ok({ object: { sha: body.sha } });
    }
    return new Response(`{"message":"not found ${method} ${p}"}`, { status: 404 });
  };
}

let gh: FakeGitHub;

beforeEach(() => {
  process.env.GITHUB_TOKEN = 'fake';
  process.env.GITHUB_REPO = 'bia-vini/nobios';
  gh = new FakeGitHub(snapshotToFiles(createSeed()));
  vi.stubGlobal('fetch', gh.fetch);
});
afterEach(() => vi.unstubAllGlobals());

const get = async () => {
  const res = await snapshot(new Request('https://x/api/snapshot'));
  return { status: res.status, body: (await res.json()) as { snapshot: Snapshot; error?: string } };
};
const post = async (body: unknown) => {
  const res = await commit(new Request('https://x/api/commit', { method: 'POST', body: JSON.stringify(body) }));
  return { status: res.status, body: (await res.json()) as { sha?: string; error?: string } };
};

describe('Netlify Functions ↔ GitHub', () => {
  it('lê todos os registros e os números batem com os dados de exemplo', async () => {
    const { status, body } = await get();
    expect(status).toBe(200);
    const f = buildFinance(body.snapshot, '2026-11-01');
    const local = buildFinance(createSeed(), '2026-11-01');
    expect(f.totals).toEqual(local.totals);
    expect(body.snapshot.installments).toHaveLength(createSeed().installments.length);
  });

  it('registrar pagamento vira um commit com 1 arquivo novo', async () => {
    const before = gh.head;
    const payment = { id: 'pay_teste1', contractId: 'con_bella', installmentId: 'ins_bella_4', amount: 250000, paidAt: '2026-11-01', method: 'pix', paidBy: 'per_bia' };
    const { status } = await post({ changes: [{ op: 'put', entity: 'payments', record: payment }], message: 'Registrar pagamento' });
    expect(status).toBe(200);
    expect(gh.commits.get(gh.head)!.parents).toEqual([before]);
    expect(gh.commits.get(gh.head)!.message).toContain('Registrar pagamento');
    const saved = JSON.parse(gh.files().get('data/payments/pay_teste1.json')!);
    expect(saved).toMatchObject(payment);
    expect(saved.updatedAt).toBeTruthy();
    const f = buildFinance((await get()).body.snapshot, '2026-11-01');
    expect(f.installments.find((v) => v.installment.id === 'ins_bella_4')!.status).toBe('paid');
  });

  it('contrato + parcelas num único commit; exclusão remove o arquivo', async () => {
    const n = gh.commits.size;
    const changes = [
      { op: 'put', entity: 'contracts', record: { id: 'con_dj', supplierId: 'sup_somarte', categoryId: 'cat_musica', title: 'DJ', totalValue: 450000, contractDate: '2026-11-01', status: 'active' } },
      ...[1, 2, 3].map((i) => ({ op: 'put', entity: 'installments', record: { id: `ins_dj_${i}`, contractId: 'con_dj', label: `Parcela ${i}/3`, sequence: i, amount: 150000, dueDate: `2026-1${i}-01`.replace('2026-13', '2027-01') } })),
      { op: 'delete', entity: 'quotes', id: 'quo_leo' },
    ];
    expect((await post({ changes, message: 'Novo contrato: DJ' })).status).toBe(200);
    expect(gh.commits.size).toBe(n + 1);
    expect(gh.files().has('data/installments/ins_dj_3.json')).toBe(true);
    expect(gh.files().has('data/quotes/quo_leo.json')).toBe(false);
  });

  it('se outra pessoa gravou no meio, refaz sobre o novo topo sem perder nada', async () => {
    gh.beforePatch = () => gh.externalWrite('data/people/per_avo.json', JSON.stringify({ id: 'per_avo', name: 'Avó' }));
    const { status } = await post({ changes: [{ op: 'put', entity: 'people', record: { id: 'per_padrinhos', name: 'Padrinhos', color: '#000', sortOrder: 9, active: true } }], message: 'Pessoa' });
    expect(status).toBe(200);
    expect(gh.files().has('data/people/per_avo.json')).toBe(true);
    expect(gh.files().has('data/people/per_padrinhos.json')).toBe(true);
  });

  it('apagar algo que já não existe não quebra', async () => {
    const { status } = await post({ changes: [{ op: 'delete', entity: 'payments', id: 'pay_nao_existe' }], message: 'x' });
    expect(status).toBe(200);
  });

  it('recusa ids e coleções inválidos (o link é aberto)', async () => {
    expect((await post({ changes: [{ op: 'put', entity: 'payments', record: { id: '../../package' } }] })).status).toBe(400);
    expect((await post({ changes: [{ op: 'put', entity: 'segredos', record: { id: 'pay_x' } }] })).status).toBe(400);
    expect((await post({ changes: [{ op: 'delete', entity: 'wedding', id: 'wedding' }] })).status).toBe(400);
    expect((await post({ changes: [] })).status).toBe(400);
    expect((await post('nada')).status).toBe(400);
  });

  it('mensagem clara quando falta configuração', async () => {
    delete process.env.GITHUB_TOKEN;
    const { status, body } = await get();
    expect(status).toBe(500);
    expect(body.error).toContain('GITHUB_TOKEN');
  });

  it('mensagem clara quando a pasta data/ não existe', async () => {
    gh = new FakeGitHub({ 'README.md': '#' });
    vi.stubGlobal('fetch', gh.fetch);
    const { status, body } = await get();
    expect(status).toBe(404);
    expect(body.error).toContain('data:init');
  });
});
