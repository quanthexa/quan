export async function onRequest(context) {
  const { env } = context;
  return new Response(JSON.stringify({
    ok: true,
    hasKV: !!env.CONTENT,
    hasPassword: !!env.ADMIN_PASSWORD
  }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
