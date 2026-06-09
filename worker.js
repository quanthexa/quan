function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': new URL(request.url).origin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Password',
    'Cache-Control': 'no-store'
  };
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

async function handleLogin(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== 'POST') return json(request, { ok: false, error: 'Method not allowed.' }, 405);
  if (!env.ADMIN_PASSWORD) return json(request, { ok: false, error: 'ADMIN_PASSWORD environment variable is not configured.' }, 500);

  let body = {};
  try { body = await request.json(); } catch (_) {}
  if (body.password !== env.ADMIN_PASSWORD) return json(request, { ok: false, error: 'Wrong password.' }, 401);
  return json(request, { ok: true, token: env.ADMIN_PASSWORD });
}

async function handleContent(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });

  if (!env.CONTENT) {
    return json(request, { ok: false, configured: false, error: 'KV binding CONTENT is not configured.' }, request.method === 'GET' ? 200 : 500);
  }

  if (request.method === 'GET') {
    const stored = await env.CONTENT.get('site-content-v1', 'json');
    return json(request, { ok: true, configured: true, stored: !!stored, content: stored || null });
  }

  if (request.method === 'POST') {
    const expected = env.ADMIN_PASSWORD;
    if (!expected) return json(request, { ok: false, error: 'ADMIN_PASSWORD environment variable is not configured.' }, 500);

    const auth = request.headers.get('Authorization') || '';
    const pass = request.headers.get('X-Admin-Password') || auth.replace(/^Bearer\s+/i, '');
    if (pass !== expected) return json(request, { ok: false, error: 'Unauthorized.' }, 401);

    let payload;
    try { payload = await request.json(); }
    catch (error) { return json(request, { ok: false, error: 'Invalid JSON payload.' }, 400); }

    payload.updatedAt = new Date().toISOString();
    await env.CONTENT.put('site-content-v1', JSON.stringify(payload));
    return json(request, { ok: true, saved: true, updatedAt: payload.updatedAt });
  }

  return json(request, { ok: false, error: 'Method not allowed.' }, 405);
}

function handleStatus(request, env) {
  return json(request, {
    ok: true,
    hasKV: !!env.CONTENT,
    hasPassword: !!env.ADMIN_PASSWORD
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (path === '/api/login') return handleLogin(request, env);
    if (path === '/api/content') return handleContent(request, env);
    if (path === '/api/status') return handleStatus(request, env);

    return env.ASSETS.fetch(request);
  }
};
