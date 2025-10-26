#!/bin/bash

# K1.reinvented Device Control Script
# Quick testing of audio-reactive patterns

DEVICE_IP="${1:-192.168.0.18}"
DEVICE_URL="http://$DEVICE_IP"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== K1.reinvented Device Control ===${NC}"
echo "Device IP: $DEVICE_IP"
echo ""

# Function to list patterns
list_patterns() {
    echo -e "${YELLOW}Available Patterns:${NC}"
    curl -s "$DEVICE_URL/api/patterns" | jq -r '.patterns[] | "\(.index): \(.name) [\(.id)] - \(.description)"'
}

# Function to select pattern
select_pattern() {
    local pattern_id=$1
    echo -e "${YELLOW}Selecting pattern: $pattern_id${NC}"

    # Try by index first
    if [[ $pattern_id =~ ^[0-9]+$ ]]; then
        curl -s -X POST "$DEVICE_URL/api/select" \
            -H "Content-Type: application/json" \
            -d "{\"index\": $pattern_id}" | jq .
    else
        # Try by ID string
        curl -s -X POST "$DEVICE_URL/api/select" \
            -H "Content-Type: application/json" \
            -d "{\"id\": \"$pattern_id\"}" | jq .
    fi
}

# Function to get current params
get_params() {
    echo -e "${YELLOW}Current Parameters:${NC}"
    curl -s "$DEVICE_URL/api/params" | jq .
}

# Function to set param
set_param() {
    local key=$1
    local value=$2

    echo -e "${YELLOW}Setting $key = $value${NC}"
    curl -s -X POST "$DEVICE_URL/api/params" \
        -H "Content-Type: application/json" \
        -d "{\"$key\": $value}" | jq .
}

# Function to test audio reactivity
test_audio_reactivity() {
    echo -e "${GREEN}Testing Audio Reactivity...${NC}"
    echo "Play music near the microphone and watch for LED response"
    echo ""
    echo "Testing patterns:"
    patterns=("emotiscope_spectrum" "emotiscope_fft" "emotiscope_octave" "audio_test_spectrum_bin")

    for pattern in "${patterns[@]}"; do
        echo -e "${YELLOW}→ Testing: $pattern${NC}"
        select_pattern "$pattern"
        echo "  Listening for 10 seconds..."
        sleep 10
        echo "  Did you see LEDs respond to music? (y/n)"
    done
}

# Main menu
case "${1:-menu}" in
    "menu")
        echo "Usage: $0 [command] [args...]"
        echo ""
        echo "Commands:"
        echo "  list                    List all available patterns"
        echo "  select <id>             Select pattern by ID or index (e.g., '0' or 'bass_pulse')"
        echo "  params                  Get current parameters"
        echo "  set <key> <value>       Set parameter (e.g., 'brightness 0.5')"
        echo "  test                    Test audio reactivity with multiple patterns"
        echo "  help                    Show this help"
        echo ""
        echo "Examples:"
        echo "  $0 list"
        echo "  $0 select 0"
        echo "  $0 select emotiscope_spectrum"
        echo "  $0 set brightness 0.8"
        echo "  $0 test"
        ;;
    "list")
        list_patterns
        ;;
    "select")
        select_pattern "$2"
        ;;
    "params")
        get_params
        ;;
    "set")
        set_param "$2" "$3"
        ;;
    "test")
        test_audio_reactivity
        ;;
    "help")
        echo "Usage: $0 [command]"
        echo "Commands: list, select, params, set, test, help"
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Run: $0 help"
        ;;
esac
