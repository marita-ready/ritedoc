export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const brevoResponse = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
  "Content-Type": "application/json",
  "api-key": "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",
},


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
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
