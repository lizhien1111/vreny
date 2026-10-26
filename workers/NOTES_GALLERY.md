# Cloud gallery (R2)

After R2 enabled:

```bash
cd /workspace/vreny-tmp/workers
npx wrangler r2 bucket create comfy-phone-gallery
npx wrangler secret put UPLOAD_TOKEN -c wrangler.gallery.toml   # paste upload token
npx wrangler secret put VIEW_KEY -c wrangler.gallery.toml       # paste view key
npx wrangler deploy -c wrangler.gallery.toml
```

Local secrets (do not commit):
- `.gallery_upload_token`
- `.gallery_view_key`

Phone page LS keys:
- comfy_phone_cloud_on
- comfy_phone_cloud_base
- comfy_phone_cloud_upload
- comfy_phone_cloud_view
