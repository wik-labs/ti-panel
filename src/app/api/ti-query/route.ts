export default async function handler(req, res) {
  const part = req.query.partNumber;
  const clientId = process.env.TI_CLIENT_ID;
  const clientSecret = process.env.TI_CLIENT_SECRET;

  try {
    // STEP 1: Get access token
    const tokenRes = await fetch("https://transact.ti.com/v1/oauth/accesstoken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(401).json({ error: "Unable to retrieve access token" });
    }

    // STEP 2: Call Inventory & Pricing API
    const apiRes = await fetch(
      `https://transact.ti.com/v1/store/products/inventory-pricing?partNumbers=${part}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await apiRes.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Server error", details: error });
  }
}

