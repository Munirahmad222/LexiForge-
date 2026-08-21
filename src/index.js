import { CORS } from './utils.js';
import { handleGenerate } from './api/generate.js';
import { handleImage } from './api/image.js';
import { handleVision } from './api/vision.js'; // Import the new vision handler

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
      // Point the vision route to the handleVision function
      if (url.pathname === '/api/vision' && request.method === 'POST') {
        return await handleVision(request, env);
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
