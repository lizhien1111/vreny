#!/bin/bash
# Watchdog: keep start_api (6008) alive. Learned from 425 zealman daemon.sh.
set +e
export PATH="/root/miniconda3/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
LOG_DIR="${COMFY_LOG_DIR:-/root/autodl-tmp/logs}"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/vreny_daemon.log"
PORT="${COMFY_START_PORT:-6008}"
INTERVAL="${VRENY_DAEMON_INTERVAL:-60}"

resolve_start_api() {
  for cand in \
    /root/autodl-tmp/vreny_autostart/start_api.sh \
    /root/autodl-fs/vreny_autostart/start_api.sh \
    /autodl-fs/data/vreny_autostart/start_api.sh \
    /root/autodl-tmp/start_api.sh; do
    [[ -f "$cand" ]] && { echo "$cand"; return 0; }
  done
  return 1
}

echo "$(date -Iseconds): daemon start interval=${INTERVAL}s port=$PORT" >>"$LOG"
while true; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo 000)
  if ! echo "$CODE" | grep -qE '200'; then
    SCRIPT=$(resolve_start_api || true)
    echo "$(date -Iseconds): 6008 down (http=$CODE); restart via ${SCRIPT:-NONE}" >>"$LOG"
    if [[ -n "$SCRIPT" ]]; then
      bash "$SCRIPT" >>"$LOG" 2>&1 || true
    fi
  fi
  sleep "$INTERVAL"
done
