/**
 * Acesso ao GitHub — só roda no servidor (Netlify Functions). O token nunca vai para o navegador.
 *
 * Layout dos dados no repositório (um arquivo por registro, para evitar conflitos):
 *   data/wedding/wedding.json
 *   data/categories/<id>.json, data/suppliers/<id>.json, … (uma pasta por coleção)
 *
 * Leitura: 1 chamada GraphQL traz todos os arquivos de uma vez.
 * Escrita: Git Data API → um único commit com todas as mudanças da ação (ex.: contrato + 6 parcelas).
 */

export const COLLECTIONS = ['categories', 'suppliers', 'quotes', 'contracts', 'installments', 'payments', 'people', 'users'] as const;
export type Collection = (typeof COLLECTIONS)[number];
export type Entity = Collection | 'wedding';

type Json = Record<string, unknown>;

export interface Snapshot {
  wedding: Json;
  categories: Json[];
  suppliers: Json[];
  quotes: Json[];
  contracts: Json[];
  installments: Json[];
  payments: Json[];
  people: Json[];
  users: Json[];
}

export type Change = { op: 'put'; entity: Entity; record: Json } | { op: 'delete'; entity: Collection; id: string };

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // "usuario/nobios"
  const branch = process.env.GITHUB_BRANCH || 'main';
  const dir = (process.env.DATA_DIR || 'data').replace(/^\/|\/$/g, '');
  if (!token || !repo || !repo.includes('/')) {
    throw new HttpError(500, 'Configuração incompleta no Netlify: defina GITHUB_TOKEN e GITHUB_REPO (usuario/repositorio).');
  }
  const [owner, name] = repo.split('/');
  return { token, owner, name, branch, dir };
}

const API = 'https://api.github.com';

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token } = getConfig();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'nobios-app',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new HttpError(res.status, `GitHub ${res.status} em ${path}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

// ─────────────────────────── leitura

interface GqlBlob {
  text?: string | null;
}
interface GqlEntry {
  name: string;
  type: string;
  object: { entries?: { name: string; object: GqlBlob | null }[] } | GqlBlob | null;
}

/** Lê todos os registros com uma única consulta GraphQL. */
export async function readSnapshot(): Promise<{ snapshot: Snapshot; sha: string }> {
  const { owner, name, branch, dir } = getConfig();
  const query = `query($owner:String!,$name:String!,$ref:String!,$expr:String!){
    repository(owner:$owner,name:$name){
      ref(qualifiedName:$ref){ target{ oid } }
      object(expression:$expr){ ... on Tree { entries { name type object {
        ... on Tree { entries { name object { ... on Blob { text } } } }
      } } } }
    }
  }`;
  const res = await gh<{ data?: { repository: { ref: { target: { oid: string } } | null; object: { entries: GqlEntry[] } | null } | null }; errors?: { message: string }[] }>(
    '/graphql',
    { method: 'POST', body: JSON.stringify({ query, variables: { owner, name, ref: `refs/heads/${branch}`, expr: `${branch}:${dir}` } }) },
  );
  if (res.errors?.length) throw new HttpError(502, `GitHub GraphQL: ${res.errors.map((e) => e.message).join('; ')}`);
  const repo = res.data?.repository;
  if (!repo) throw new HttpError(404, `Repositório ${owner}/${name} não encontrado ou sem acesso pelo token.`);
  if (!repo.ref) throw new HttpError(404, `Branch "${branch}" não encontrada em ${owner}/${name}.`);
  if (!repo.object) throw new HttpError(404, `Pasta "${dir}/" não encontrada no repositório. Rode "npm run data:init" e faça o commit.`);

  const snapshot: Snapshot = { wedding: {}, categories: [], suppliers: [], quotes: [], contracts: [], installments: [], payments: [], people: [], users: [] };
  let hasWedding = false;
  for (const folder of repo.object.entries) {
    if (folder.type !== 'tree' || !folder.object || !('entries' in folder.object) || !folder.object.entries) continue;
    const files = folder.object.entries.filter((f) => f.name.endsWith('.json') && f.object?.text);
    if (folder.name === 'wedding') {
      const w = files.find((f) => f.name === 'wedding.json');
      if (w) {
        snapshot.wedding = JSON.parse(w.object!.text!);
        hasWedding = true;
      }
      continue;
    }
    if (!(COLLECTIONS as readonly string[]).includes(folder.name)) continue;
    snapshot[folder.name as Collection] = files.map((f) => JSON.parse(f.object!.text!));
  }
  if (!hasWedding) throw new HttpError(404, `Arquivo "${dir}/wedding/wedding.json" não encontrado.`);
  return { snapshot, sha: repo.ref.target.oid };
}

// ─────────────────────────── escrita

const ID_RE = /^[a-z]{3}_[a-z0-9_]{1,60}$/;

/** Validação mínima: impede caminhos estranhos e lotes absurdos (o link é aberto). */
export function validateChanges(input: unknown): Change[] {
  if (!Array.isArray(input) || input.length === 0) throw new HttpError(400, 'Nenhuma mudança enviada.');
  if (input.length > 300) throw new HttpError(400, 'Mudanças demais numa única ação.');
  return input.map((c, i) => {
    const ch = c as Change;
    if (ch?.op === 'delete') {
      if (!(COLLECTIONS as readonly string[]).includes(ch.entity)) throw new HttpError(400, `Mudança ${i}: coleção inválida.`);
      if (typeof ch.id !== 'string' || !ID_RE.test(ch.id)) throw new HttpError(400, `Mudança ${i}: id inválido.`);
      return ch;
    }
    if (ch?.op === 'put') {
      if (ch.entity !== 'wedding' && !(COLLECTIONS as readonly string[]).includes(ch.entity)) throw new HttpError(400, `Mudança ${i}: coleção inválida.`);
      if (!ch.record || typeof ch.record !== 'object' || Array.isArray(ch.record)) throw new HttpError(400, `Mudança ${i}: registro inválido.`);
      const id = (ch.record as { id?: unknown }).id;
      if (ch.entity === 'wedding' ? id !== 'wedding' : typeof id !== 'string' || !ID_RE.test(id)) throw new HttpError(400, `Mudança ${i}: id inválido.`);
      return ch;
    }
    throw new HttpError(400, `Mudança ${i}: operação inválida.`);
  });
}

function pathOf(dir: string, ch: Change): string {
  if (ch.op === 'put' && ch.entity === 'wedding') return `${dir}/wedding/wedding.json`;
  const id = ch.op === 'put' ? (ch.record.id as string) : ch.id;
  return `${dir}/${ch.entity}/${id}.json`;
}

/**
 * Grava todas as mudanças num único commit.
 * Se outra pessoa gravou no meio tempo (branch andou), refaz sobre o estado novo — até 4 tentativas.
 */
export async function commitChanges(changes: Change[], message: string): Promise<string> {
  const { owner, name, branch, dir } = getConfig();
  const base = `/repos/${owner}/${name}`;
  const now = new Date().toISOString();
  const entries = changes.map((ch) =>
    ch.op === 'put'
      ? {
          path: pathOf(dir, ch),
          mode: '100644',
          type: 'blob',
          content: `${JSON.stringify({ createdAt: now, ...ch.record, updatedAt: now }, null, 2)}\n`,
        }
      : { path: pathOf(dir, ch), mode: '100644', type: 'blob', sha: null },
  );

  for (let attempt = 1; attempt <= 4; attempt++) {
    const ref = await gh<{ object: { sha: string } }>(`${base}/git/ref/heads/${branch}`);
    const head = ref.object.sha;
    const commit = await gh<{ tree: { sha: string } }>(`${base}/git/commits/${head}`);
    // apagar um arquivo que não existe faz o GitHub recusar a árvore: filtramos esses casos
    const existing = await existingPaths(base, commit.tree.sha, entries.filter((e) => e.sha === null).map((e) => e.path));
    const tree = entries.filter((e) => e.sha !== null || existing.has(e.path));
    if (tree.length === 0) return head;
    const newTree = await gh<{ sha: string }>(`${base}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
    const newCommit = await gh<{ sha: string }>(`${base}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({ message: `${message}\n\nvia Nobios`, tree: newTree.sha, parents: [head] }),
    });
    try {
      await gh(`${base}/git/refs/heads/${branch}`, { method: 'PATCH', body: JSON.stringify({ sha: newCommit.sha, force: false }) });
      return newCommit.sha;
    } catch (e) {
      // 422 = não é fast-forward (alguém gravou antes). Tenta de novo sobre o novo topo.
      if (e instanceof HttpError && e.status === 422 && attempt < 4) continue;
      throw e;
    }
  }
  throw new HttpError(409, 'Muitas gravações ao mesmo tempo. Tente de novo.');
}

async function existingPaths(base: string, treeSha: string, paths: string[]): Promise<Set<string>> {
  if (paths.length === 0) return new Set();
  const t = await gh<{ tree: { path: string }[] }>(`${base}/git/trees/${treeSha}?recursive=1`);
  const all = new Set(t.tree.map((x) => x.path));
  return new Set(paths.filter((p) => all.has(p)));
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) {
    // 401/403 do GitHub = problema de token
    if (e.status === 401 || e.status === 403) return json(502, { error: 'O token do GitHub não tem permissão. Confira GITHUB_TOKEN no Netlify.' });
    return json(e.status >= 400 && e.status < 600 ? e.status : 500, { error: e.message });
  }
  return json(500, { error: e instanceof Error ? e.message : 'Erro inesperado' });
}
