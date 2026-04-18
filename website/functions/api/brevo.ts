export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const brevoResponse = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": context.env.VITE_BREVO_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const responseData = await brevoResponse.text();

    return new Response(responseData, {
      status: brevoResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
