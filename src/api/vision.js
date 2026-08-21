import { CORS } from '../utils.js';

export async function handleVision(request, env) {
  try {
    const body = await request.json();
    const prompt = body.prompt || "Describe this image";
    const imageBase64 = body.imageBase64;

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'Image is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

    // Convert Base64 to Binary
    const binary = atob(imageBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Run Cloudflare AI
    const result = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      prompt: prompt,
      image: [...bytes]
    });

    const output = result.description || result.response || "Analysis complete.";

    return new Response(JSON.stringify({ output }), {
      headers: { 'Content-Type': 'application/json', ...CORS }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS }
    });
  }
}
