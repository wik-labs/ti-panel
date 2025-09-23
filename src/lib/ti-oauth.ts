// src/lib/ti-oauth.ts
// Uniwersalny helper do pobierania i cache'owania tokenu TI OAuth

let cachedToken: string | null = null;
let expiresAt = 0;

/**
 * Zwraca ważny token dostępu do TI.
 * Wymaga ENV:
 *  - TI_CLIENT_ID
 *  - TI_CLIENT_SECRET
 *  - TI_TOKEN_URL (np. https://api.ti.com/oauth/token)  ← ustaw w .env.local
 *  - opcjonalnie TI_SCOPE (jeśli TI tego wymaga)
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < expiresAt) {
    return cachedToken;
  }

  const clientId = process.env.TI_CLIENT_ID;
  const clientSecret = process.env.TI_CLIENT_SECRET;
  const tokenUrl = process.env.TI_TOKEN_URL; // NIE hardcodujemy, daj do .env.local
  const scope = process.env.TI_SCOPE;        // opcjonalnie

  if (!clientId || !clientSecret || !tokenUrl) {
    throw new Error('Missing TI OAuth env: TI_CLIENT_ID, TI_CLIENT_SECRET, TI_TOKEN_URL');
  }

  const body = new URLSearchParams();
  body.set('grant_type', 'client_credentials');
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  if (scope) body.set('scope', scope);

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    // Next.js fetch w API routes działa po stronie serwera (Node)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`TI OAuth failed (${res.status}): ${txt}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const token = data.access_token;
  const ttl = (data.expires_in ?? 3600) * 1000;

  // ustaw „bufor” 30s, by nie wyjść na przeterminowany token
  cachedToken = token;
  expiresAt = Date.now() + ttl - 30_000;

  return token;
}
