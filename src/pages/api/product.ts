import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { partNumber } = req.query;

  if (!partNumber) {
    return res.status(400).json({ message: 'Missing part number' });
  }

  try {
    const tokenRes = await fetch('https://transact.ti.com/v1/oauth/accesstoken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.TI_CLIENT_ID || '',
        client_secret: process.env.TI_CLIENT_SECRET || '',
        grant_type: 'client_credentials',
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const productRes = await fetch(`https://api.ti.com/v1/product/${partNumber}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!productRes.ok) {
      const errData = await productRes.json();
      return res.status(productRes.status).json(errData);
    }

    const data = await productRes.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

