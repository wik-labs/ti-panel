export async function POST(req: Request) {
  try {
    const body = await req.json();
    const partNumber = body.query;

    const token = await getToken();

    const tiResponse = await fetch(
      `https://transact.ti.com/v1/products/${partNumber}?storePricing=true`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!tiResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'TI API request failed', status: tiResponse.status }),
        {
          status: tiResponse.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await tiResponse.json();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API error:', err);
    return new Response(JSON.stringify({ error: 'Something went wrong' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

const getToken = async (): Promise<string> => {
  const clientId = process.env.TI_CLIENT_ID!;
  const clientSecret = process.env.TI_CLIENT_SECRET!;

  const response = await fetch('https://transact.ti.com/v1/oauth/accesstoken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to retrieve access token');
  }

  const data = await response.json();
  return data.access_token;
};

