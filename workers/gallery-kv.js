/**
 * Comfy phone cloud gallery via Workers KV (no R2 needed).
 * POST /upload  Authorization: Bearer UPLOAD_TOKEN, body=PNG bytes, header X-Filename
 * GET  /?k=VIEW_KEY  HTML gallery
 * GET  /file/<key>?k=VIEW_KEY  image bytes
 * GET  /api/list?k=VIEW_KEY
 * DELETE /api/delete  Authorization + JSON {key}
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Filename",
  "Access-Control-Max-Age": "86400",
};
const INDEX_KEY = "meta:index";
const MAX_LIST = 400;
const MAX_BYTES = 20 * 1024 * 1024; // KV value soft cap under 25MB

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
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
  if (!want) return true;
  return url.searchParams.get("k") === want;
}
function sanitizeName(name) {
  name = String(name || "comfy.png").replace(/[^a-zA-Z0-9._-]+/g, "_");
  if (!/\.(png|jpe?g|webp)$/i.test(name)) name += ".png";
  return name.slice(0, 160);
}
function datePrefix(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}
function filePath(key, viewKey) {
  const path = "/file/" + String(key).split("/").map(encodeURIComponent).join("/");
  return viewKey ? path + "?k=" + encodeURIComponent(viewKey) : path;
}
async function readIndex(env) {
  const raw = await env.GALLERY_KV.get(INDEX_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
async function writeIndex(env, items) {
  const trimmed = items.slice(0, MAX_LIST);
  await env.GALLERY_KV.put(INDEX_KEY, JSON.stringify(trimmed));
  return trimmed;
}
function galleryHtml(items, viewKey) {
  const cards = items
    .map((it) => {
      const name = (it.filename || it.key || "").split("/").pop();
      const path = filePath(it.key, viewKey);
      const when = it.uploaded ? String(it.uploaded).replace("T", " ").slice(0, 19) + " UTC" : "";
      return `<a class="card" href="${path}" target="_blank" rel="noopener"><img loading="lazy" src="${path}" alt="${name}"/><span>${name}<br/><small>${when}</small></span></a>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="robots" content="noindex,nofollow"/>
<title>出图云库</title>
<style>
:root{color-scheme:dark}
body{margin:0;font:15px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#0b0b0c;color:#eee}
header{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;background:#121214cc;backdrop-filter:blur(8px);border-bottom:1px solid #222}
h1{margin:0;font-size:16px;font-weight:600}
.meta{opacity:.7;font-size:12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;padding:12px}
.card{display:block;background:#16161a;border:1px solid #26262b;border-radius:12px;overflow:hidden;color:inherit;text-decoration:none}
.card img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;background:#000}
.card span{display:block;padding:8px 10px;font-size:11px;word-break:break-all;opacity:.85}
.empty{padding:48px 16px;text-align:center;opacity:.6}
</style></head><body>
<header><h1>出图云库</h1><div class="meta">${items.length} 张 · 各设备打开本页即可看</div></header>
${items.length ? `<div class="grid">${cards}</div>` : `<div class="empty">还没有图。手机出图页勾选「存到云库」后会出现在这里。</div>`}
</body></html>`;
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return okEmpty();
    const url = new URL(req.url);

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      if (!checkView(url, env)) return unauthorized();
      const items = await readIndex(env);
      return new Response(galleryHtml(items, env.VIEW_KEY || ""), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...CORS },
      });
    }

    if (req.method === "GET" && url.pathname === "/api/list") {
      if (!checkView(url, env)) return unauthorized();
      return json({ ok: true, items: await readIndex(env) });
    }

    if (req.method === "GET" && url.pathname.startsWith("/file/")) {
      if (!checkView(url, env)) return unauthorized();
      const key = decodeURIComponent(url.pathname.slice("/file/".length));
      if (!key.startsWith("img/") || key.includes("..")) return json({ ok: false, error: "bad key" }, 400);
      const obj = await env.GALLERY_KV.get(key, { type: "arrayBuffer" });
      if (!obj) return json({ ok: false, error: "not found" }, 404);
      const headers = new Headers(CORS);
      headers.set("Content-Type", "image/png");
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Content-Length", String(obj.byteLength));
      return new Response(obj, { headers });
    }

    if (req.method === "POST" && url.pathname === "/upload") {
      if (!checkUpload(req, env)) return unauthorized();
      const buf = await req.arrayBuffer();
      if (!buf.byteLength) return json({ ok: false, error: "empty body" }, 400);
      if (buf.byteLength > MAX_BYTES) return json({ ok: false, error: "too large (>" + MAX_BYTES + ")" }, 413);
      const filename = sanitizeName(req.headers.get("X-Filename") || "comfy.png");
      const key = `img/${datePrefix()}/${Date.now()}_${filename}`;
      await env.GALLERY_KV.put(key, buf, {
        metadata: { filename, bytes: String(buf.byteLength) },
      });
      const uploaded = new Date().toISOString();
      const items = await readIndex(env);
      items.unshift({ key, filename, size: buf.byteLength, uploaded });
      await writeIndex(env, items);
      const view = env.VIEW_KEY || "";
      return json({
        ok: true,
        key,
        url: filePath(key, view),
        gallery: view ? `/?k=${encodeURIComponent(view)}` : "/",
        bytes: buf.byteLength,
      });
    }

    if (req.method === "DELETE" && url.pathname === "/api/delete") {
      if (!checkUpload(req, env)) return unauthorized();
      let body = {};
      try { body = await req.json(); } catch {}
      const key = String(body.key || "");
      if (!key.startsWith("img/") || key.includes("..")) return json({ ok: false, error: "bad key" }, 400);
      await env.GALLERY_KV.delete(key);
      const items = (await readIndex(env)).filter((x) => x.key !== key);
      await writeIndex(env, items);
      return json({ ok: true, deleted: key });
    }

    return json({ ok: false, error: "not found" }, 404);
  },
};
