import { CORS } from './utils.js';
import { handleGenerate } from './api/generate.js';
import { handleImage } from './api/image.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    try {
      if (url.pathname === '/api/generate' && request.method === 'POST') {
        return await handleGenerate(request, env);
      }

      if (url.pathname === '/api/image' && request.method === 'POST') {
        return await handleImage(request, env);
      }

      if (url.pathname === '/api/vision' && request.method === 'POST') {
        const body = await request.json();
        const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
          prompt: body.prompt || "Describe this image",
          image: [...Uint8Array.from(atob(body.imageBase64), c => c.charCodeAt(0))]
        });
        const output = response.description || response.response || "Done";
        return new Response(JSON.stringify({ output }), {
          headers: { 'Content-Type': 'application/json', ...CORS }
        });
      }

      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }
  }
};
