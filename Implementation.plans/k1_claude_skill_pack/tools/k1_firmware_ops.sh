#!/usr/bin/env bash
# K1 Firmware Ops: build → OTA → (optional) QA → artifacts
# - Reads defaults from tools/k1.config.json
# - Calls your existing tools/build-and-upload.sh if present
# - Otherwise falls back to PlatformIO compile + network upload (ArduinoOTA)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$REPO_ROOT/tools/k1.config.json"

# --------- tiny JSON reader (jq required) ---------
need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: required tool '$1' not found on PATH" >&2
    exit 1
  fi
}
need jq
need bash

jq_val() {
  local key="$1"
  jq -r ".$key // empty" "$CONFIG_FILE"
}

# --------- args ---------
PATTERN="${1:-}"
DEVICE_IP=""
OTA_METHOD=""
RUN_QA="false"

# parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--pattern) PATTERN="$2"; shift 2 ;;
    -i|--ip) DEVICE_IP="$2"; shift 2 ;;
    -m|--ota-method) OTA_METHOD="$2"; shift 2 ;;
    --qa) RUN_QA="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# fallbacks from config
if [[ -z "${PATTERN:-}" ]]; then PATTERN="$(jq_val 'pattern')"; fi
if [[ -z "${DEVICE_IP:-}" ]]; then DEVICE_IP="$(jq_val 'device_ip')"; fi
if [[ -z "${OTA_METHOD:-}" ]]; then OTA_METHOD="$(jq_val 'ota_method')"; fi
UPLOAD_PORT="$(jq_val 'upload_port')"
DASHBOARD_PATH="$(jq_val 'dashboard_path')"

if [[ -z "${PATTERN:-}" ]]; then echo "ERROR: pattern not set (use --pattern or tools/k1.config.json)"; exit 1; fi
if [[ -z "${DEVICE_IP:-}" ]]; then echo "ERROR: device_ip not set (use --ip or tools/k1.config.json)"; exit 1; fi

TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
ART_DIR="$REPO_ROOT/artifacts/$TIMESTAMP"
mkdir -p "$ART_DIR"

echo "== K1 Firmware Ops ==" | tee "$ART_DIR/ops.log"
echo "Pattern        : $PATTERN" | tee -a "$ART_DIR/ops.log"
echo "Device IP      : $DEVICE_IP" | tee -a "$ART_DIR/ops.log"
echo "OTA method req : $OTA_METHOD" | tee -a "$ART_DIR/ops.log"
echo "Artifacts dir  : $ART_DIR" | tee -a "$ART_DIR/ops.log"

# --------- Build + Upload ---------
BUILD_SCRIPT="$REPO_ROOT/tools/build-and-upload.sh"
if [[ -x "$BUILD_SCRIPT" ]]; then
  echo "[1/3] Build+Upload via existing script: $BUILD_SCRIPT" | tee -a "$ART_DIR/ops.log"
  # Pass both args; script may choose upload method internally
  # Capture full output
  set +e
  bash "$BUILD_SCRIPT" "$PATTERN" "$DEVICE_IP" | tee "$ART_DIR/build.log"
  STATUS="${PIPESTATUS[0]}"
  set -e
  if [[ "$STATUS" -ne 0 ]]; then
    echo "Existing build script failed (exit $STATUS). See $ART_DIR/build.log" | tee -a "$ART_DIR/ops.log"
    exit "$STATUS"
  fi
else
  echo "[1/3] Build via PlatformIO (fallback)" | tee -a "$ART_DIR/ops.log"
  need pio
  pushd "$REPO_ROOT" >/dev/null
  # Compile
  pio run | tee "$ART_DIR/build.log"
  # Upload choice
  case "$OTA_METHOD" in
    http)
      echo "HTTP OTA selected, probing endpoint..." | tee -a "$ART_DIR/ops.log"
      if command -v curl >/dev/null 2>&1 && curl -sI "http://$DEVICE_IP/update" | head -n1 | grep -q "200"; then
        echo "HTTP /update reachable; uploading..." | tee -a "$ART_DIR/ops.log"
        # Attempt standard Arduino HTTP Update endpoint (may differ per firmware)
        curl -f -X POST -F "image=@.pio/build/esp32-s3-devkitc-1/firmware.bin" "http://$DEVICE_IP/update" | tee -a "$ART_DIR/ops.log"
      else
        echo "HTTP /update not reachable; falling back to ArduinoOTA" | tee -a "$ART_DIR/ops.log"
        pio run -t upload --upload-port "$DEVICE_IP" | tee -a "$ART_DIR/ops.log"
      fi ;;
    arduino|*)
      echo "ArduinoOTA selected" | tee -a "$ART_DIR/ops.log"
      pio run -t upload --upload-port "$DEVICE_IP" | tee -a "$ART_DIR/ops.log"
      ;;
  esac
  popd >/dev/null
fi

# Save a minimal metadata file
cat > "$ART_DIR/metadata.json" <<EOF
{
  "pattern": "$PATTERN",
  "device_ip": "$DEVICE_IP",
  "ota_method": "$OTA_METHOD",
  "dashboard_path": "$DASHBOARD_PATH",
  "timestamp": "$TIMESTAMP"
}
EOF

# --------- Optional QA ---------
if [[ "$RUN_QA" == "true" ]]; then
  echo "[2/3] Running Playwright API+UI tests" | tee -a "$ART_DIR/ops.log"
  need node
  pushd "$REPO_ROOT/tools/qa/playwright" >/dev/null
  if [[ ! -d "node_modules" ]]; then
    npm ci
    npx playwright install
  fi
  # Export base URL and artifacts dir for the test runner
  export K1_BASE_URL="http://$DEVICE_IP"
  export K1_DASHBOARD_PATH="$DASHBOARD_PATH"
  export K1_ARTIFACTS="$ART_DIR"
  npx playwright test --reporter=list,json | tee "$ART_DIR/playwright_run.log"
  popd >/dev/null
fi

echo "[3/3] Done. Artifacts in $ART_DIR" | tee -a "$ART_DIR/ops.log"
