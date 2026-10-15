/**
 * Optional server-side Gemini proxy (Vercel Function).
 *
 * The game works fully without this: if GEMINI_API_KEY isn't set in the
 * Vercel project, GET reports { enabled: false } and the client uses its
 * scripted fallback. The key only ever lives in Vercel's environment, never
 * in the client bundle or the repo.
 */
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const MAX_TEXT = 600;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

export function GET() {
  return json({ enabled: !!process.env.GEMINI_API_KEY });
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: 'not configured' }, 503);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  const system = String(body?.system || '').slice(0, 8000);
  const message = String(body?.message || '').slice(0, MAX_TEXT);
  const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
  if (!message) return json({ error: 'empty' }, 400);

  const contents = [
    ...history.map((m: any) => ({
      role: m?.role === 'alien' ? 'model' : 'user',
      parts: [{ text: String(m?.content || '').slice(0, MAX_TEXT) }]
    })),
    { role: 'user', parts: [{ text: message }] }
  ];

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature: 0.95, topP: 0.95, maxOutputTokens: 512 }
        })
      }
    );
    if (!r.ok) return json({ error: `upstream ${r.status}` }, 502);
    const data: any = await r.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('').trim() || '';
    if (!text) return json({ error: 'empty reply' }, 502);
    return json({ text: text.replace(/\*+/g, '') });
  } catch {
    return json({ error: 'upstream failed' }, 502);
  }
}
