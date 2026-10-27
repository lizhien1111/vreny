#!/bin/bash
# Run on AutoDL instance (无卡 OK).
# Scripts: shared FS + data-disk backup; thin boot hook waits for FS then falls back.
set -e
FS="${AUTODL_FS:-/root/autodl-fs}"
# AutoDL mounts shared storage at /autodl-fs/data; /root/autodl-fs is usually a symlink
if [[ ! -d "$FS" ]] && [[ -d /autodl-fs/data ]]; then
  FS=/autodl-fs/data
fi
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCAL="/root/autodl-tmp/vreny_autostart"
mkdir -p "$LOCAL" "$LOCAL/comfy_shutdown_node" /root/autodl-tmp/logs /root/.autodl

copy_bundle() {
  local dest="$1"
  mkdir -p "$dest" "$dest/comfy_shutdown_node"
  cp -f "$SRC_DIR/comfy_start_api.py" "$dest/comfy_start_api.py"
  cp -f "$SRC_DIR/start_api.sh" "$dest/start_api.sh"
  cp -f "$SRC_DIR/boot_comfy.sh" "$dest/boot_comfy.sh"
  if [[ -f "$SRC_DIR/comfy_shutdown_node/__init__.py" ]]; then
    cp -f "$SRC_DIR/comfy_shutdown_node/__init__.py" "$dest/comfy_shutdown_node/__init__.py"
  fi
  chmod +x "$dest/start_api.sh" "$dest/boot_comfy.sh"
}

# Always keep a copy on data disk (available at boot even before FS mounts)
copy_bundle "$LOCAL"

# Also sync to shared account FS when mounted (shared across instances)
if [[ -d "$FS" ]]; then
  DST="$FS/vreny_autostart"
  copy_bundle "$DST"
  echo "FS_SYNC_OK $DST"
else
  DST=""
  echo "WARN: 文件存储未挂载，仅写入数据盘 $LOCAL"
fi

# Also link/copy shutdown node into this instance's Comfy custom_nodes if present
if [[ -d /root/autodl-tmp/ComfyUI/custom_nodes ]]; then
  mkdir -p /root/autodl-tmp/ComfyUI/custom_nodes/comfy_shutdown_node
  if [[ -f "$LOCAL/comfy_shutdown_node/__init__.py" ]]; then
    cp -f "$LOCAL/comfy_shutdown_node/__init__.py" /root/autodl-tmp/ComfyUI/custom_nodes/comfy_shutdown_node/__init__.py
  fi
fi

# Convenience copies at autodl-tmp root (older docs/paths)
cp -f "$LOCAL/comfy_start_api.py" /root/autodl-tmp/comfy_start_api.py
cp -f "$LOCAL/start_api.sh" /root/autodl-tmp/start_api.sh
cp -f "$LOCAL/boot_comfy.sh" /root/autodl-tmp/boot_comfy.sh
chmod +x /root/autodl-tmp/start_api.sh /root/autodl-tmp/boot_comfy.sh

# AutoDL runs /root/.autodl/start.sh on every boot (有卡/无卡都一样)
# Wait for shared FS (often mounts after start.sh), then fall back to data-disk copy.
cat > /root/.autodl/start.sh <<'SH'
#!/bin/bash
# phone page: start_api on 6008; Comfy only when phone hits POST /start
set +e
mkdir -p /root/autodl-tmp/logs
LOG=/root/autodl-tmp/logs/autodl_start_hook.log
{
  echo "=== autodl start.sh $(date -Iseconds) ==="
  FS_SCRIPT=""
  for i in $(seq 1 90); do
    for cand in \
      /root/autodl-fs/vreny_autostart/start_api.sh \
      /autodl-fs/data/vreny_autostart/start_api.sh \
      /root/autodl-tmp/vreny_autostart/start_api.sh \
      /root/autodl-tmp/start_api.sh; do
      if [[ -f "$cand" ]]; then
        FS_SCRIPT="$cand"
        break 2
      fi
    done
    sleep 2
  done
  if [[ -z "$FS_SCRIPT" ]]; then
    echo "ERROR: start_api.sh not found after wait"
    exit 0
  fi
  echo "using $FS_SCRIPT"
  nohup bash "$FS_SCRIPT" >>"$LOG" 2>&1 &
  echo "spawned pid=$!"
} >>"$LOG" 2>&1
SH
chmod +x /root/.autodl/start.sh

# Start API now so phone can use it before next reboot
bash "$LOCAL/start_api.sh" || true
sleep 1
curl -sS -m 3 http://127.0.0.1:6008/health || true
echo
echo INSTALL_OK local=$LOCAL fs=${DST:-none}
ls -la /root/.autodl/start.sh "$LOCAL/start_api.sh" "$LOCAL/comfy_start_api.py" "$LOCAL/boot_comfy.sh"
