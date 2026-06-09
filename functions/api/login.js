export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': new URL(request.url).origin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const json = (body, status = 200) => new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
  });
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);
  if (!env.ADMIN_PASSWORD) return json({ ok: false, error: 'ADMIN_PASSWORD environment variable is not configured.' }, 500);
  let body = {};
  try { body = await request.json(); } catch (_) {}
  if (body.password !== env.ADMIN_PASSWORD) return json({ ok: false, error: 'Wrong password.' }, 401);
  return json({ ok: true, token: env.ADMIN_PASSWORD });
}
