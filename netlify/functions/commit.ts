import { commitChanges, errorResponse, HttpError, json, validateChanges } from './_lib/github';

const MAX_BODY = 1_000_000; // 1 MB

/** POST /api/commit — { changes, message } → um commit no GitHub */
export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'Use POST' });
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) throw new HttpError(413, 'Envio grande demais.');
    let body: { changes?: unknown; message?: unknown };
    try {
      body = JSON.parse(raw);
    } catch {
      throw new HttpError(400, 'JSON inválido.');
    }
    const changes = validateChanges(body.changes);
    const message = typeof body.message === 'string' && body.message.trim() ? body.message.trim().slice(0, 200) : 'Atualizar dados';
    const sha = await commitChanges(changes, message);
    return json(200, { sha });
  } catch (e) {
    return errorResponse(e);
  }
};
