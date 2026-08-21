import { CORS } from './utils.js';
import { handleGenerate } from './api/generate.js';
import { handleImage } from './api/image.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    try {
      // 2. API Routes
      if (url.pathname === '/api/generate' && request.method === 'POST') {
        const res = await handleGenerate(request, env);
        Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }

      if (url.pathname === '/api/image' && request.method === 'POST') {
        const res = await handleImage(request, env);
        Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }

      if (url.pathname === '/api/vision' && request.method === 'POST') {
        const body = await request.json();
        
        if (!body.imageBase64) {
          return new Response(JSON.stringify({ error: "No image data" }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...CORS } 
          });
        }

        // Processing the image via Cloudflare AI
        const aiResponse = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
          prompt: body.prompt || "Describe this image",
          image: [...Uint8Array.from(atob(body.imageBase64), c => c.charCodeAt(0))]
        });

        const result = aiResponse.description || aiResponse.response || "Image analyzed.";

        return new Response(JSON.stringify({ output: result }), {
          headers: { 'Content-Type': 'application/json', ...CORS }
        });
      }

      // 3. Serve Static Assets
      return await env.ASSETS.fetch(request);

    } catch (e) {
      // Global Error Handler
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }
  }
};
