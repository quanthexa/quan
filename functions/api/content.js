export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': new URL(request.url).origin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Password',
    'Cache-Control': 'no-store'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const json = (body, status = 200) => new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
  });

  if (!env.CONTENT) {
    return json({ ok: false, configured: false, error: 'KV binding CONTENT is not configured.' }, request.method === 'GET' ? 200 : 500);
  }

  if (request.method === 'GET') {
    const stored = await env.CONTENT.get('site-content-v1', 'json');
    return json({ ok: true, configured: true, stored: !!stored, content: stored || null });
  }

  if (request.method === 'POST') {
    const expected = env.ADMIN_PASSWORD;
    if (!expected) return json({ ok: false, error: 'ADMIN_PASSWORD environment variable is not configured.' }, 500);

    const auth = request.headers.get('Authorization') || '';
    const pass = request.headers.get('X-Admin-Password') || auth.replace(/^Bearer\s+/i, '');
    if (pass !== expected) return json({ ok: false, error: 'Unauthorized.' }, 401);

    let payload;
    try { payload = await request.json(); }
    catch (error) { return json({ ok: false, error: 'Invalid JSON payload.' }, 400); }

    payload.updatedAt = new Date().toISOString();
    await env.CONTENT.put('site-content-v1', JSON.stringify(payload));
    return json({ ok: true, saved: true, updatedAt: payload.updatedAt });
  }

  return json({ ok: false, error: 'Method not allowed.' }, 405);
}
