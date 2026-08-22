import { json } from '../utils.js';

export async function handleVision(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid request body' }, 400);
  }

  const prompt = (body && body.prompt) ? String(body.prompt).trim() : 'Describe this image.';
  const imageBase64 = body && body.imageBase64;
  if (!imageBase64) return json({ error: 'imageBase64 is required' }, 400);

  try {
    const binary = atob(imageBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const result = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
      image: Array.from(bytes),
      prompt,
      max_tokens: 512
    });
    const output = (result && (result.description || result.response)) || '';
    if (!output) throw new Error('empty response from model');
    return json({ output });
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}
