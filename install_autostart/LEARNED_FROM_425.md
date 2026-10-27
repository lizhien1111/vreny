# Learned from AutoDL 425 (zealman community image)

425 does **not** use our scripts. Image: `comfyanonymous/ComfyUI/wan2.2-i2v:v7` with `/root/zealman-app`.

Why cold-start feels solid:
1. **Dual/triple hooks**: `/etc/rc.local` + `/etc/profile.d/zealman-autostart.sh` (not only `/root/.autodl/start.sh`)
2. **Watchdog daemon** every 5 min restarts 6008 if down
3. **Lock file** avoids double start
4. 6008 is zealman Node control panel (`POST /api/start`, `GET /api/health`); Comfy on 6006

We mirrored hooks + daemon for lightweight `comfy_start_api.py` (phone uses `POST /start`).
