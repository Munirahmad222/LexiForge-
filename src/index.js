import { CORS } from './utils.js';
import { handleGenerate } from './api/generate.js';
import { handleImage } from './api/image.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    try {
      // 1. Text Generation API
      if (url.pathname === '/api/generate' && request.method === 'POST') {
        return await handleGenerate(request, env);
      }
      
      // 2. Image Generation API
      if (url.pathname === '/api/image' && request.method === 'POST') {
        return await handleImage(request, env);
      }

      // 3. Vision API (For processing uploaded images)
      if (url.pathname === '/api/vision' && request.method === 'POST') {
        const body = await request.json();
        
        if (!body.imageBase64) {
          throw new Error("No image data provided");
        }

        // Processing image using Cloudflare AI
        const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
          prompt: body.prompt || "Describe this image",
          image: [...Uint8Array.from(atob(body.imageBase64), c => c.charCodeAt(0))]
        });

        const result = response.description || response.response || "Analysis complete, but no text output generated.";

        return new Response(JSON.stringify({ output: result }), {
          headers: { 'Content-Type': 'application/json', ...CORS }
        });
      }

    } catch (e) {
      // Error handling
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

    // Default: Serve static assets
    return env.ASSETS.fetch(request);
  }
};
