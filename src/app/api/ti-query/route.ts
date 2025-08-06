export async function POST(req: Request) {
  try {
    const body = await req.json();

    // TODO: Use actual TI API logic here
    const mockResult = {
      query: body.query,
      status: 'success',
      message: 'Mock response from TI API',
    };

    return new Response(JSON.stringify(mockResult), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Something went wrong' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

