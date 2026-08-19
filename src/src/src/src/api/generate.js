import { json } from '../utils.js';
import { TOOLS } from '../tools.js';

export async function handleGenerate(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid request body' }, 400);
  }

  const { tool, input, history } = body || {};
  const def = TOOLS[tool];
  if (!def) return json({ error: 'unknown tool: ' + tool }, 400);
  if (!input || !String(input).trim()) return json({ error: 'input is required' }, 400);

  const messages = [{ role: 'system', content: def.system }];

  // Chatbot keeps a short rolling history; other tools are single-shot.
  if (tool === 'chatbot' && Array.isArray(history)) {
    for (const turn of history.slice(-10)) {
      if (turn && (turn.role === 'user' || turn.role === 'assistant') && turn.content) {
        messages.push({ role: turn.role, content: String(turn.content) });
      }
    }
  }
  messages.push({ role: 'user', content: String(input) });

  try {
    const result = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages,
      max_tokens: 1200
    });
    const output = (result && (result.response || result.result)) || '';
    if (!output) throw new Error('empty response from model');
    return json({ output });
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}
