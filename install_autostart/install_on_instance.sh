#!/bin/bash
# Run on AutoDL instance (无卡 OK).
# Lessons from 425 (zealman image): dual boot hooks (rc.local + profile.d + .autodl)
# + lock + watchdog daemon. We keep lightweight Python start_api for phone POST /start.
set -e
FS="${AUTODL_FS:-/root/autodl-fs}"
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
  cp -f "$SRC_DIR/daemon_start_api.sh" "$dest/daemon_start_api.sh"
  if [[ -f "$SRC_DIR/comfy_shutdown_node/__init__.py" ]]; then
    cp -f "$SRC_DIR/comfy_shutdown_node/__init__.py" "$dest/comfy_shutdown_node/__init__.py"
  fi
  chmod +x "$dest/start_api.sh" "$dest/boot_comfy.sh" "$dest/daemon_start_api.sh"
}

copy_bundle "$LOCAL"

if [[ -d "$FS" ]]; then
  DST="$FS/vreny_autostart"
  copy_bundle "$DST"
  echo "FS_SYNC_OK $DST"
else
  DST=""
  echo "WARN: 文件存储未挂载，仅写入数据盘 $LOCAL"
fi

if [[ -d /root/autodl-tmp/ComfyUI/custom_nodes ]]; then
  mkdir -p /root/autodl-tmp/ComfyUI/custom_nodes/comfy_shutdown_node
  if [[ -f "$LOCAL/comfy_shutdown_node/__init__.py" ]]; then
    cp -f "$LOCAL/comfy_shutdown_node/__init__.py" /root/autodl-tmp/ComfyUI/custom_nodes/comfy_shutdown_node/__init__.py
  fi
fi

cp -f "$LOCAL/comfy_start_api.py" /root/autodl-tmp/comfy_start_api.py
cp -f "$LOCAL/start_api.sh" /root/autodl-tmp/start_api.sh
cp -f "$LOCAL/boot_comfy.sh" /root/autodl-tmp/boot_comfy.sh
cp -f "$LOCAL/daemon_start_api.sh" /root/autodl-tmp/daemon_start_api.sh
chmod +x /root/autodl-tmp/start_api.sh /root/autodl-tmp/boot_comfy.sh /root/autodl-tmp/daemon_start_api.sh

# Shared boot body: wait for scripts, start API, spawn daemon (425-style)
BOOT_BODY='#!/bin/bash
set +e
mkdir -p /root/autodl-tmp/logs
LOG=/root/autodl-tmp/logs/autodl_start_hook.log
LOCK=/tmp/vreny_autostart.lock
{
  echo "=== vreny boot $(date -Iseconds) ==="
  if [[ -f "$LOCK" ]]; then
    opid=$(cat "$LOCK" 2>/dev/null || true)
    if [[ -n "$opid" ]] && kill -0 "$opid" 2>/dev/null; then
      echo "lock held by $opid, skip"
      exit 0
    fi
    rm -f "$LOCK"
  fi
  echo $$ >"$LOCK"
  FS_SCRIPT=""
  for i in $(seq 1 90); do
    for cand in \
      /root/autodl-fs/vreny_autostart/start_api.sh \
      /autodl-fs/data/vreny_autostart/start_api.sh \
      /root/autodl-tmp/vreny_autostart/start_api.sh \
      /root/autodl-tmp/start_api.sh; do
      if [[ -f "$cand" ]]; then FS_SCRIPT="$cand"; break 2; fi
    done
    sleep 2
  done
  if [[ -z "$FS_SCRIPT" ]]; then
    echo "ERROR: start_api.sh not found after wait"
    rm -f "$LOCK"
    exit 0
  fi
  echo "using $FS_SCRIPT"
  bash "$FS_SCRIPT" >>"$LOG" 2>&1 || true
  DAEMON=""
  for cand in \
    /root/autodl-tmp/vreny_autostart/daemon_start_api.sh \
    /root/autodl-fs/vreny_autostart/daemon_start_api.sh \
    /autodl-fs/data/vreny_autostart/daemon_start_api.sh \
    /root/autodl-tmp/daemon_start_api.sh; do
    if [[ -f "$cand" ]]; then DAEMON="$cand"; break; fi
  done
  if [[ -n "$DAEMON" ]] && ! pgrep -f "daemon_start_api.sh" >/dev/null 2>&1; then
    nohup bash "$DAEMON" >>"$LOG" 2>&1 &
    echo "daemon pid=$!"
  fi
  rm -f "$LOCK"
} >>"$LOG" 2>&1
'

# 1) AutoDL official hook
printf '%s\n' "$BOOT_BODY" > /root/.autodl/start.sh
chmod +x /root/.autodl/start.sh

# 2) rc.local (425 pattern — fires on container start even if .autodl misses)
printf '%s\n' "$BOOT_BODY" > /etc/rc.local
chmod +x /etc/rc.local

# 3) profile.d (425 pattern — login shells as backup)
printf '%s\n' "$BOOT_BODY" > /etc/profile.d/vreny-autostart.sh
chmod +x /etc/profile.d/vreny-autostart.sh

# Start API + daemon now
bash "$LOCAL/start_api.sh" || true
if ! pgrep -f "daemon_start_api.sh" >/dev/null 2>&1; then
  nohup bash "$LOCAL/daemon_start_api.sh" >>/root/autodl-tmp/logs/autodl_start_hook.log 2>&1 &
fi
sleep 1
curl -sS -m 3 http://127.0.0.1:6008/health || true
echo
echo INSTALL_OK local=$LOCAL fs=${DST:-none} hooks=.autodl+rc.local+profile.d+daemon
ls -la /root/.autodl/start.sh /etc/rc.local /etc/profile.d/vreny-autostart.sh \
  "$LOCAL/start_api.sh" "$LOCAL/daemon_start_api.sh" "$LOCAL/comfy_start_api.py" "$LOCAL/boot_comfy.sh"
