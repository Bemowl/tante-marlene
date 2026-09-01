const ALLOWED_ORIGINS = new Set([
  "https://bemowl.github.io",
]);

const UPSTREAM = "https://tante-marlene-delivery.bemowl.chatgpt.site/api/delivery";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://bemowl.github.io",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    let body;
    try {
      body = await request.text();
      const parsed = JSON.parse(body);
      if (!parsed?.address || typeof parsed.address !== "string") throw new Error("invalid address");
    } catch {
      return new Response(JSON.stringify({ error: "Dirección no válida." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    try {
      const upstream = await fetch(UPSTREAM, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    } catch {
      return new Response(JSON.stringify({ error: "No pudimos calcular esta ruta." }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }
  },
};
