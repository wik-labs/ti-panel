// cache token jak w ti-query/route.ts
let cachedToken: string| null = null;
let expiresAt = 0;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < expiresAt) return cachedToken;

  const resp = await fetch(
    'https://transact.ti.com/v1/oauth/accesstoken',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.TI_CLIENT_ID!,
        client_secret: process.env.TI_CLIENT_SECRET!,
      }),
    }
  );
  if (!resp.ok) throw new Error('Token fetch failed');
  const { access_token, expires_in } = await resp.json();
  cachedToken = access_token;
  expiresAt = now + expires_in*1000 - 30*1000;
  return cachedToken;
}

export async function POST(req: Request) {
  try {
    const { generic } = await req.json() as { generic: string };
    const token = await getToken();

    // używamy “search” endpointu - GET /v2/store/products?genericPartNumber=
    const url = `https://transact.ti.com/v2/store/products?genericPartNumber=${encodeURIComponent(
      generic
    )}&currency=USD`;

    const tiResp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!tiResp.ok) {
      return new Response(
        JSON.stringify({ error: 'TI API request failed', status: tiResp.status }),
        { status: tiResp.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await tiResp.json(); // to będzie array of objects
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Generic search error', error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

