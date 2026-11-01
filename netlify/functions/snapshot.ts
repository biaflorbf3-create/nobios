import { errorResponse, json, readSnapshot } from './_lib/github';

/** GET /api/snapshot — todos os dados do casamento, lidos do GitHub */
export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return json(405, { error: 'Use GET' });
  try {
    const { snapshot, sha } = await readSnapshot();
    return json(200, { snapshot, sha });
  } catch (e) {
    return errorResponse(e);
  }
};
