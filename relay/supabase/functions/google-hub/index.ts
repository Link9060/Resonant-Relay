import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const ALLOWED_ORIGINS = new Set([
  'https://resonantrelay.org',
  'https://www.resonantrelay.org',
  'https://link9060.github.io',
  'http://localhost:3000',
]);

function cors(req: Request) {
  const origin = req.headers.get('Origin');
  return {
    ...(origin && ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  };
}

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });

  return new Response(JSON.stringify({
    error: 'This legacy Google integration endpoint has been retired. Use calendar-hub.',
    code: 'legacy_endpoint_retired',
  }), {
    status: 410,
    headers: {
      ...cors(req),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
});
