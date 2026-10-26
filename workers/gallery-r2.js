/**
 * Comfy phone cloud gallery: R2 store + HTML gallery.
 * Phone page POSTs PNG to /upload with Bearer UPLOAD_TOKEN.
 * Any device opens /?k=VIEW_KEY to browse.
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Filename",
  "Access-Control-Max-Age": "86400",
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS, ...extra },
  });
}

function okEmpty() {
  return new Response(null, { status: 204, headers: CORS });
}

function unauthorized() {
  return json({ ok: false, error: "unauthorized" }, 401);
}

function checkUpload(req, env) {
  const want = (env.UPLOAD_TOKEN || "").trim();
  if (!want) return false;
  const h = req.headers.get("Authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return !!(m && m[1].trim() === want);
}

function checkView(url, env) {
  const want = (env.VIEW_KEY || "").trim();
  if (!want) return true; // if unset, public
  return url.searchParams.get("k") === want;
}

function sanitizeName(name) {
  name = String(name || "comfy.png").replace(/[^a-zA-Z0-9._-]+/g, "_");
  if (!/\.(png|jpe?g|webp)$/i.test(name)) name += ".png";
  return name.slice(0, 180);
}

function datePrefix(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

async function listImages(env, limit = 200) {
  const out = [];
  let cursor;
  do {
    const page = await env.GALLERY_BUCKET.list({ limit: Math.min(1000, limit - out.length), cursor, prefix: "img/" });
    for (const o of page.objects || []) {
      if (!o.key || o.key.endsWith("/")) continue;
      out.push({
        key: o.key,
        size: o.size,
        uploaded: o.uploaded ? new Date(o.uploaded).toISOString() : null,
      });
      if (out.length >= limit) break;
    }
    cursor = page.truncated ? page.cursor : null;
  } while (cursor && out.length < limit);
  out.sort((a, b) => String(b.uploaded || "").localeCompare(String(a.uploaded || "")));
  return out;
}

function galleryHtml(items, viewKey) {
  const q = viewKey ? `?k=${encodeURIComponent(viewKey)}` : "";
  const cards = items.map((it) => {
    const name = it.key.split("/").pop();
    const src = `/file/${encodeURIComponent(it.key).replace(/%2F/g, "/")}${q}`;
    // encodeURIComponent on full key breaks slashes — build path segments
    const path = "/file/" + it.key.split("/").map(encodeURIComponent).join("/") + (viewKey ? `?k=${encodeURIComponent(viewKey)}` : "");
    const when = it.uploaded ? it.uploaded.replace("T", " ").slice(0, 19) + " UTC" : "";
    return `<a class="card" href="${path}" target="_blank" rel="noopener"><img loading="lazy" src="${path}" alt="${name}"/><span>${name}<br/><small>${when}</small></span></a>`;
  }).join("\n");
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="robots" content="noindex,nofollow"/>
<title>出图云库</title>
<style>
  :root { color-scheme: dark; }
  body{margin:0;font:15px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#0b0b0c;color:#eee;}
  header{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;background:#121214cc;backdrop-filter:blur(8px);border-bottom:1px solid #222;}
  h1{margin:0;font-size:16px;font-weight:600;}
  .meta{opacity:.7;font-size:12px;}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;padding:12px;}
  .card{display:block;background:#16161a;border:1px solid #26262b;border-radius:12px;overflow:hidden;color:inherit;text-decoration:none;}
  .card img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;background:#000;}
  .card span{display:block;padding:8px 10px;font-size:11px;word-break:break-all;opacity:.85;}
  .empty{padding:48px 16px;text-align:center;opacity:.6;}
</style>
</head>
<body>
<header>
  <h1>出图云库</h1>
  <div class="meta">${items.length} 张 · 各设备打开本页即可看</div>
</header>
${items.length ? `<div class="grid">${cards}</div>` : `<div class="empty">还没有图。手机出图页勾选「存到云库」后会出现在这里。</div>`}
</body>
</html>`;
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return okEmpty();
    const url = new URL(req.url);

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      if (!checkView(url, env)) return unauthorized();
      const items = await listImages(env, 300);
      const html = galleryHtml(items, env.VIEW_KEY || "");
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...CORS },
      });
    }

    if (req.method === "GET" && url.pathname === "/api/list") {
      if (!checkView(url, env)) return unauthorized();
      const items = await listImages(env, 300);
      return json({ ok: true, items });
    }

    if (req.method === "GET" && url.pathname.startsWith("/file/")) {
      if (!checkView(url, env)) return unauthorized();
      const key = decodeURIComponent(url.pathname.slice("/file/".length));
      if (!key.startsWith("img/") || key.includes("..")) return json({ ok: false, error: "bad key" }, 400);
      const obj = await env.GALLERY_BUCKET.get(key);
      if (!obj) return json({ ok: false, error: "not found" }, 404);
      const headers = new Headers(CORS);
      headers.set("Content-Type", obj.httpMetadata?.contentType || "image/png");
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      if (obj.size != null) headers.set("Content-Length", String(obj.size));
      return new Response(obj.body, { headers });
    }

    if (req.method === "POST" && url.pathname === "/upload") {
      if (!checkUpload(req, env)) return unauthorized();
      const buf = await req.arrayBuffer();
      if (!buf.byteLength) return json({ ok: false, error: "empty body" }, 400);
      if (buf.byteLength > 40 * 1024 * 1024) return json({ ok: false, error: "too large (>40MB)" }, 413);
      const filename = sanitizeName(req.headers.get("X-Filename") || "comfy.png");
      const key = `img/${datePrefix()}/${Date.now()}_${filename}`;
      await env.GALLERY_BUCKET.put(key, buf, {
        httpMetadata: { contentType: "image/png" },
        customMetadata: { filename },
      });
      const view = env.VIEW_KEY ? `?k=${encodeURIComponent(env.VIEW_KEY)}` : "";
      return json({
        ok: true,
        key,
        url: `/file/${key.split("/").map(encodeURIComponent).join("/")}${view}`,
        gallery: `/${view}`,
        bytes: buf.byteLength,
      });
    }

    if (req.method === "DELETE" && url.pathname === "/api/delete") {
      if (!checkUpload(req, env)) return unauthorized();
      let body = {};
      try { body = await req.json(); } catch {}
      const key = String(body.key || "");
      if (!key.startsWith("img/") || key.includes("..")) return json({ ok: false, error: "bad key" }, 400);
      await env.GALLERY_BUCKET.delete(key);
      return json({ ok: true, deleted: key });
    }

    return json({ ok: false, error: "not found" }, 404);
  },
};
