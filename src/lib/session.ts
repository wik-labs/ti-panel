// src/lib/session.ts
// WERSJA EDGE-SAFE: tylko Web Crypto + atob/btoa, zero importów z 'crypto'.
const te = new TextEncoder();
const td = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = (globalThis.btoa as (s: string) => string)(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = (globalThis.atob as (s: string) => string)(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacSha256(data: string, secret: string): Promise<Uint8Array> {
  // Edge & Node 18+ mają globalThis.crypto.subtle
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto subtle API not available in this runtime.');
  }
  const key = await subtle.importKey(
    'raw',
    te.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await subtle.sign('HMAC', key, te.encode(data));
  return new Uint8Array(sig);
}

export type SessionPayload = { sub: string; iat: number; exp: number };

export async function createSession(
  username: string,
  ttlHours: number,
  secret: string
) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + Math.max(1, ttlHours) * 3600;
  const payload: SessionPayload = { sub: username, iat, exp };
  const header = { alg: 'HS256', typ: 'JWT' };

  const head = toBase64Url(te.encode(JSON.stringify(header)));
  const body = toBase64Url(te.encode(JSON.stringify(payload)));
  const sig = toBase64Url(await hmacSha256(`${head}.${body}`, secret));
  return `${head}.${body}.${sig}`;
}

export async function verifySession(
  token: string | undefined | null,
  secret: string
): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;

  const expected = toBase64Url(await hmacSha256(`${head}.${body}`, secret));

  // constant-time porównanie
  const a = fromBase64Url(sig);
  const b = fromBase64Url(expected);
  if (a.length !== b.length) return null;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) return null;

  try {
    const payload = JSON.parse(td.decode(fromBase64Url(body))) as SessionPayload;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
