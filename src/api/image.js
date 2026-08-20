import { json } from '../utils.js';

export async function handleImage(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid request body' }, 400);
  }

  const prompt = (body && body.prompt) ? String(body.prompt).trim() : '';
  if (!prompt) return json({ error: 'prompt is required' }, 400);

  try {
    const result = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps: 6 });
    const b64 = result && (result.image || result.images?.[0]);
    if (!b64) throw new Error('empty response from model');
    return json({ image: `data:image/jpeg;base64,${b64}` });
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}
