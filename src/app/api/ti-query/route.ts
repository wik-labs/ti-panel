export async function POST(request: Request) {
  try {
    const { query: partNumber } = await request.json();
    const token = await getToken();

    const url = `https://transact.ti.com/v2/store/products/${encodeURIComponent(partNumber)}?currency=USD`;
console.error('Fetching TI single-OPN URL:', url);

const tiResp = await fetch(url, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  },
});

    // Jeżeli TI zwróci 404 lub pustą tablicę → naprawdę brak produktu
    if (tiResp.status === 404) {
      return new Response(
        JSON.stringify({ error: 'Not Found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await tiResp.json();

    // Jeżeli tablica jest pusta
    if (Array.isArray(data) && data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Not Found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Jeśli TI zwróci array[0] → rozpakowujemy
    const result = Array.isArray(data) ? data[0] : data;

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


const getToken = async (): Promise<string> => {
  const clientId = process.env.TI_CLIENT_ID!;
  const clientSecret = process.env.TI_CLIENT_SECRET!;

  const resp = await fetch('https://transact.ti.com/v1/oauth/accesstoken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!resp.ok) throw new Error('Failed to retrieve access token');
  const { access_token } = await resp.json();
  return access_token;
};

