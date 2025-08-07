export async function POST(req: Request) {
  try {
    const { query: partNumber } = await req.json();
    const token = await getToken();

    // → Inventory & Pricing API v2
    const tiResp = await fetch(
      `https://transact.ti.com/v2/store/products/${encodeURIComponent(partNumber)}?currency=USD`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!tiResp.ok) {
      return new Response(
        JSON.stringify({ error: 'TI API request failed', status: tiResp.status }),
        { status: tiResp.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await tiResp.json();
    return new Response(JSON.stringify(data), {
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

