/**
 * AutoDL API CORS proxy for phone page.
 * Phone → Worker → www.autodl.com
 * Forward Authorization header; only allow instance power endpoints.
 */
const ALLOW = new Set([
  "/api/v1/instance/power_off",
  "/api/v1/instance/power_on",
  "/api/v1/instance",
]);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    const url = new URL(req.url);
    const path = url.pathname;
    if (!ALLOW.has(path)) {
      return new Response(JSON.stringify({ ok: false, error: "path not allowed" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }
    const auth = req.headers.get("Authorization") || "";
    if (!auth) {
      return new Response(JSON.stringify({ ok: false, error: "missing Authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }
    const headers = {
      Authorization: auth,
      "Content-Type": "application/json",
    };
    const init = { method: req.method, headers };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = await req.text();
    }
    const upstream = await fetch("https://www.autodl.com" + path + url.search, init);
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        ...CORS,
      },
    });
  },
};
