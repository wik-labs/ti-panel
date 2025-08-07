// src/lib/ti-oauth.ts
import axios from 'axios';

let cachedToken: string | null = null;
let expiresAt = 0;

export async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < expiresAt) {
    return cachedToken;
  }

  // Odczytaj CLIENT_ID i CLIENT_SECRET z env
  const clientId     = process.env.TI_CLIENT_ID!;
  const clientSecret = process.env.TI_CLIENT_SECRET!;

  const resp = await axios.post(
    'https://transact.ti.com/v1/oauth/accesstoken',
    new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token, expires_in } = resp.data;
  cachedToken = access_token;
  // odrobinę wcześniej, żeby się nie przeterminował
  expiresAt   = now + expires_in * 1000 - 30 * 1000;

  return access_token;
}

