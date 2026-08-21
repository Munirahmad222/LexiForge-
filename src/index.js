import { CORS } from './utils.js';
import { handleGenerate } from './api/generate.js';
import { handleImage } from './api/image.js';
import { handleVision } from './api/vision.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    try {
      if (url.pathname === '/api/generate') return await handleGenerate(request, env);
      if (url.pathname === '/api/image') return await handleImage(request, env);
      if (url.pathname === '/api/vision') return await handleVision(request, env);
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...CORS } 
      });
    }
  }
};
