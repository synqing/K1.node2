#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════╗"
echo "║       K1.reinvented Build & Upload            ║"
echo "║     Compiling beauty into light                ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check arguments
if [ $# -lt 1 ]; then
    echo -e "${YELLOW}Available patterns:${NC}"
    echo "  departure  - Journey from darkness to light to growth"
    echo "  lava       - Primal intensity and transformation"
    echo "  twilight   - Peaceful transition from day to night"
    echo ""
    echo -e "${RED}Usage: $0 <pattern> [device_ip]${NC}"
    echo "Examples:"
    echo "  $0 departure"
    echo "  $0 lava 192.168.1.100"
    echo "  $0 twilight k1-reinvented.local"
    exit 1
fi

PATTERN="$1"
DEVICE_IP="${2:-}"

# Resolve pattern to graph file
case "$PATTERN" in
    departure|lava|twilight)
        GRAPH_FILE="graphs/${PATTERN}.json"
        ;;
    *)
        echo -e "${RED}Unknown pattern: $PATTERN${NC}"
        echo "Available: departure, lava, twilight"
        exit 1
        ;;
esac

# Paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CODEGEN_DIR="$PROJECT_ROOT/codegen"
FIRMWARE_DIR="$PROJECT_ROOT/firmware"
GENERATED_FILE="$FIRMWARE_DIR/src/generated_effect.h"

# Verify graph exists
if [ ! -f "$PROJECT_ROOT/$GRAPH_FILE" ]; then
    echo -e "${RED}✗ Graph not found: $GRAPH_FILE${NC}"
    exit 1
fi

# Step 1: Compile graph to C++
echo -e "${YELLOW}Step 1: Compiling ${PATTERN} pattern to C++${NC}"
cd "$CODEGEN_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing codegen dependencies..."
    npm install > /dev/null 2>&1
fi

# Build TypeScript
npm run build > /dev/null 2>&1

# Generate C++ code
echo "  Compiling: $GRAPH_FILE"
node dist/index.js "$PROJECT_ROOT/$GRAPH_FILE" "$GENERATED_FILE"
echo -e "${GREEN}✓ Generated: $(basename "$GENERATED_FILE")${NC}"

# Step 2: Compile firmware
echo -e "${YELLOW}Step 2: Building firmware${NC}"
cd "$FIRMWARE_DIR"

# Build with PlatformIO
pio run --environment esp32-s3-devkitc-1

# Get firmware size
FIRMWARE_BIN=".pio/build/esp32-s3-devkitc-1/firmware.bin"
if [ -f "$FIRMWARE_BIN" ]; then
    SIZE=$(stat -f%z "$FIRMWARE_BIN" 2>/dev/null || stat -c%s "$FIRMWARE_BIN" 2>/dev/null)
    echo -e "${GREEN}✓ Firmware built: $(($SIZE / 1024)) KB${NC}"
else
    echo -e "${RED}✗ Firmware build failed${NC}"
    exit 1
fi

# Step 3: Upload (if IP provided)
if [ -n "$DEVICE_IP" ]; then
    echo -e "${YELLOW}Step 3: Uploading via OTA to $DEVICE_IP${NC}"

    # Try OTA upload
    if command -v curl &> /dev/null; then
        curl -X POST \
             --max-time 30 \
             --progress-bar \
             -F "file=@$FIRMWARE_BIN" \
             "http://$DEVICE_IP/update" \
             && echo -e "${GREEN}✓ Upload complete!${NC}" \
             || echo -e "${RED}✗ Upload failed${NC}"
    else
        # Fallback to PlatformIO OTA
        pio run --target upload --upload-port "$DEVICE_IP"
    fi
else
    echo -e "${YELLOW}Step 3: Upload skipped (no IP provided)${NC}"
    echo "To upload manually:"
    echo "  pio run -t upload --upload-port <device_ip>"
    echo "Or:"
    echo "  curl -X POST -F \"file=@$FIRMWARE_BIN\" http://<device_ip>/update"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗"
echo "║           ✓ Build Complete!                    ║"
echo "╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Pattern: ${BLUE}${PATTERN}${NC}"
echo -e "${YELLOW}Status: ${GREEN}Ready to run${NC}"
echo ""
echo "To monitor serial output:"
echo "  cd $FIRMWARE_DIR && pio device monitor --baud 2000000"
echo ""
echo "To try another pattern:"
echo "  ./tools/build-and-upload.sh departure"
echo "  ./tools/build-and-upload.sh lava 192.168.1.100"
echo "  ./tools/build-and-upload.sh twilight"