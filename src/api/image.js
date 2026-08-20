import { json } from '../utils.js';

const LOGO_PREFIX = 'A clean, modern, minimalist vector-style logo design, flat colors, simple shapes, centered composition, plain white background, of: ';

export async function handleImage(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid request body' }, 400);
  }

  const rawPrompt = (body && body.prompt) ? String(body.prompt).trim() : '';
  const mode = (body && body.mode) || 'image';
  if (!rawPrompt) return json({ error: 'prompt is required' }, 400);

  const prompt = mode === 'logo' ? LOGO_PREFIX + rawPrompt : rawPrompt;

  try {
    const result = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps: 6 });
    const b64 = result && (result.image || result.images?.[0]);
    if (!b64) throw new Error('empty response from model');
    return json({ image: `data:image/jpeg;base64,${b64}` });
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}
