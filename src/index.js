import { CORS } from './utils.js';
import { handleGenerate } from './api/generate.js';
import { handleImage } from './api/image.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS Handling
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    try {
      // Normal Text Generation
      if (url.pathname === '/api/generate' && request.method === 'POST') {
        const res = await handleGenerate(request, env);
        Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }
      
      // Image Generation
      if (url.pathname === '/api/image' && request.method === 'POST') {
        const res = await handleImage(request, env);
        Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }

      // 🔴 MISSING VISION API - Adding it now!
      if (url.pathname === '/api/vision' && request.method === 'POST') {
        const body = await request.json();
        
        // Cloudflare AI Model Call
        const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
          prompt: body.prompt || "Describe this image",
          image: [...Uint8Array.from(atob(body.imageBase64), c => c.charCodeAt(0))]
        });

        return new Response(JSON.stringify({ output: response.description || response.response || "I see the image but can't describe it." }), {
          headers: { 'Content-Type': 'application/json', ...CORS }
        });
      }

    } catch (e) {
      return new Response(JSON.stringify({ error: String(e.message || e) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
