#include "wifi_monitor.h"

#include <WiFi.h>
#include <WiFiUdp.h>
#include <esp_wifi.h>
#include <Preferences.h>

#include "connection_state.h"

namespace {

constexpr uint32_t WIFI_ASSOC_TIMEOUT_MS = 20000;
constexpr uint32_t WIFI_RECONNECT_INTERVAL_MS = 5000;
constexpr uint8_t MAX_NETWORK_CONNECT_ATTEMPTS = 5;
constexpr uint32_t WIFI_KEEPALIVE_INTERVAL_MS = 30000;  // Send keepalive every 30 seconds

char stored_ssid[64] = {0};
char stored_pass[64] = {0};

wifi_connect_callback_t on_connect_cb = nullptr;
wifi_connect_callback_t on_disconnect_cb = nullptr;

uint32_t next_retry_ms = 0;
uint32_t last_keepalive_ms = 0;  // Track last keepalive time
uint8_t reconnect_attempts = 0;
wl_status_t last_status = WL_NO_SHIELD;
bool connection_live = false;

// Translate WiFi disconnect reason codes to human-readable strings
static const char* get_disconnect_reason_string(uint8_t reason) {
    switch (reason) {
        case 1: return "UNSPECIFIED";
        case 2: return "AUTH_EXPIRE";
        case 3: return "AUTH_LEAVE";
        case 4: return "ASSOC_EXPIRE";
        case 5: return "ASSOC_TOOMANY";
        case 6: return "NOT_AUTHED";
        case 7: return "NOT_ASSOCED";
        case 8: return "ASSOC_LEAVE";
        case 9: return "ASSOC_NOT_AUTHED";
        case 10: return "DISASSOC_PWRCAP_BAD";
        case 11: return "DISASSOC_SUPCHAN_BAD";
        case 13: return "IE_INVALID";
        case 14: return "MIC_FAILURE";
        case 15: return "4WAY_HANDSHAKE_TIMEOUT";
        case 16: return "GROUP_KEY_UPDATE_TIMEOUT";
        case 17: return "IE_IN_4WAY_DIFFERS";
        case 18: return "GROUP_CIPHER_INVALID";
        case 19: return "PAIRWISE_CIPHER_INVALID";
        case 20: return "AKMP_INVALID";
        case 21: return "UNSUPP_RSN_IE_VERSION";
        case 22: return "INVALID_RSN_IE_CAP";
        case 23: return "802_1X_AUTH_FAILED";
        case 24: return "CIPHER_SUITE_REJECTED";
        case 200: return "BEACON_TIMEOUT";
        case 201: return "NO_AP_FOUND";
        case 202: return "AUTH_FAIL";
        case 203: return "ASSOC_FAIL";
        case 204: return "HANDSHAKE_TIMEOUT";
        case 205: return "CONNECTION_FAIL";
        case 206: return "AP_TSF_RESET";
        default: return "UNKNOWN";
    }
}

// Log WiFi events with disconnect reasons to diagnose link stability
static void on_wifi_event(arduino_event_id_t event, arduino_event_info_t info) {
    connection_logf("DEBUG", "WiFi Event Received: %d", static_cast<int>(event));
    
    switch (event) {
        case ARDUINO_EVENT_WIFI_STA_START:
            connection_logf("DEBUG", "Event: STA_START (%d)", static_cast<int>(event));
            break;
        case ARDUINO_EVENT_WIFI_STA_STOP:
            connection_logf("DEBUG", "Event: STA_STOP (%d)", static_cast<int>(event));
            break;
        case ARDUINO_EVENT_WIFI_STA_CONNECTED:
            connection_logf("INFO", "Event: STA_CONNECTED (%d) to %s", static_cast<int>(event), stored_ssid);
            break;
        case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
            {
                uint8_t reason = info.wifi_sta_disconnected.reason;
                connection_logf("WARN", "Event: STA_DISCONNECTED (%d) reason=%d (%s) RSSI=%ddBm",
                                static_cast<int>(event), static_cast<int>(reason), 
                                get_disconnect_reason_string(reason), WiFi.RSSI());
            }
            break;
        case ARDUINO_EVENT_WIFI_STA_AUTHMODE_CHANGE:
            connection_logf("DEBUG", "Event: STA_AUTHMODE_CHANGE (%d)", static_cast<int>(event));
            break;
        case ARDUINO_EVENT_WIFI_STA_GOT_IP:
            connection_logf("INFO", "Event: STA_GOT_IP (%d)", static_cast<int>(event));
            break;
        case ARDUINO_EVENT_WIFI_STA_LOST_IP:
            connection_logf("WARN", "Event: STA_LOST_IP (%d)", static_cast<int>(event));
            break;
        default:
            connection_logf("DEBUG", "Event: UNKNOWN (%d)", static_cast<int>(event));
            break;
    }
}

static void start_wifi_connect(const char* reason) {
    connection_state_transition(ConnectionState::WifiConnecting, reason);
    connection_watchdog_start(WIFI_ASSOC_TIMEOUT_MS, "WiFi association pending");
    WiFi.begin(stored_ssid, stored_pass);
    connection_logf("INFO", "Connecting to SSID '%s'", stored_ssid);
}

static void schedule_reconnect(const char* reason, uint32_t delay_ms) {
    connection_record_recovery();

    // Exponential backoff to reduce reconnect thrash; cap at 60s
    uint8_t backoff_exp = std::min<uint8_t>(reconnect_attempts, static_cast<uint8_t>(5));
    uint32_t factor = 1u << backoff_exp; // 1,2,4,8,16,32
    uint32_t effective_delay = std::min<uint32_t>(delay_ms * factor, static_cast<uint32_t>(60000));

    connection_logf("WARN", "Scheduling reconnect in %lums (%s)",
                    static_cast<unsigned long>(effective_delay), reason);
    connection_state_transition(ConnectionState::Recovering, reason);

    // Do not force a disconnect; let stack handle state transitions
    next_retry_ms = millis() + effective_delay;
    reconnect_attempts = std::min<uint8_t>(reconnect_attempts + 1, UINT8_MAX);

    connection_watchdog_start(effective_delay + WIFI_ASSOC_TIMEOUT_MS, "Awaiting reconnect window");
}

static void attempt_scheduled_reconnect(uint32_t now_ms) {
    if (next_retry_ms == 0 || now_ms < next_retry_ms) {
        return;
    }

    next_retry_ms = 0;
    start_wifi_connect("Scheduled reconnect");
}

static void handle_watchdog(uint32_t now_ms) {
    char reason[64] = {0};
    if (connection_watchdog_check(now_ms, reason, sizeof(reason))) {
        if (reason[0] == '\0') {
            strncpy(reason, "watchdog timeout", sizeof(reason) - 1);
            reason[sizeof(reason) - 1] = '\0';
        }
        schedule_reconnect(reason, WIFI_RECONNECT_INTERVAL_MS);
    }
}

static void send_wifi_keepalive(uint32_t now_ms) {
    // Only send keepalive if we're connected and enough time has passed
    if (connection_live && WiFi.isConnected() && 
        (now_ms - last_keepalive_ms >= WIFI_KEEPALIVE_INTERVAL_MS)) {
        
        // Send a simple ping to the gateway to keep the connection alive
        IPAddress gateway = WiFi.gatewayIP();
        if (gateway != IPAddress(0, 0, 0, 0)) {
            // Use a simple UDP packet to keep the connection active
            WiFiUDP udp;
            udp.beginPacket(gateway, 53);  // DNS port - most routers respond
            const char* keepalive_msg = "keepalive";
            udp.write((const uint8_t*)keepalive_msg, strlen(keepalive_msg));
            udp.endPacket();
            udp.stop();
            
            connection_logf("DEBUG", "WiFi keepalive sent to gateway %s", gateway.toString().c_str());
        }
        
        last_keepalive_ms = now_ms;
    }
}

} // namespace

// Link options (configurable via setter before init)
static bool opt_force_bg_only = true;  // default ON to keep current behavior
static bool opt_force_ht20 = true;     // default ON to keep current behavior

void wifi_monitor_set_link_options(const WifiLinkOptions& options) {
    opt_force_bg_only = options.force_bg_only;
    opt_force_ht20 = options.force_ht20;
}

void wifi_monitor_get_link_options(WifiLinkOptions& out_options) {
    out_options.force_bg_only = opt_force_bg_only;
    out_options.force_ht20 = opt_force_ht20;
}

void wifi_monitor_update_link_options(const WifiLinkOptions& options) {
    opt_force_bg_only = options.force_bg_only;
    opt_force_ht20 = options.force_ht20;

    // Apply immediately to the STA interface
    if (opt_force_bg_only) {
        esp_wifi_set_protocol(WIFI_IF_STA, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G);
    } else {
        esp_wifi_set_protocol(WIFI_IF_STA, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N);
    }

    if (opt_force_ht20) {
        esp_wifi_set_bandwidth(WIFI_IF_STA, WIFI_BW_HT20);
    } else {
        esp_wifi_set_bandwidth(WIFI_IF_STA, WIFI_BW_HT40);
    }

    connection_logf("DEBUG", "WiFi link options updated: protocol=%s, bandwidth=%s",
                    opt_force_bg_only ? "11b/g" : "11b/g/n",
                    opt_force_ht20 ? "HT20" : "HT40");
}

bool wifi_monitor_save_link_options_to_nvs(const WifiLinkOptions& options) {
    Preferences prefs;
    if (!prefs.begin("wifi_link", false)) {
        return false;
    }
    prefs.putBool("bg_only", options.force_bg_only);
    prefs.putBool("ht20", options.force_ht20);
    prefs.end();
    return true;
}

bool wifi_monitor_load_link_options_from_nvs(WifiLinkOptions& out_options) {
    Preferences prefs;
    if (!prefs.begin("wifi_link", true)) {
        // Use defaults if NVS is unavailable
        out_options.force_bg_only = true;
        out_options.force_ht20 = true;
        return false;
    }
    bool bg = prefs.getBool("bg_only", true);
    bool ht20 = prefs.getBool("ht20", true);
    prefs.end();
    out_options.force_bg_only = bg;
    out_options.force_ht20 = ht20;
    return true;
}

void wifi_monitor_init(const char* ssid, const char* pass) {
    connection_state_init();

    memset(stored_ssid, 0, sizeof(stored_ssid));
    memset(stored_pass, 0, sizeof(stored_pass));
    if (ssid != nullptr) {
        strncpy(stored_ssid, ssid, sizeof(stored_ssid) - 1);
    }
    if (pass != nullptr) {
        strncpy(stored_pass, pass, sizeof(stored_pass) - 1);
    }

    // Ensure STA interface is enabled before attempting to connect
    WiFi.mode(WIFI_STA);

    // Apply protocol settings based on options
    if (opt_force_bg_only) {
        esp_wifi_set_protocol(WIFI_IF_STA, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G);
    } else {
        esp_wifi_set_protocol(WIFI_IF_STA, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N);
    }

    // Apply bandwidth settings based on options
    if (opt_force_ht20) {
        esp_wifi_set_bandwidth(WIFI_IF_STA, WIFI_BW_HT20);
    } else {
        esp_wifi_set_bandwidth(WIFI_IF_STA, WIFI_BW_HT40);
    }

    connection_logf("DEBUG", "WiFi link options: protocol=%s, bandwidth=%s",
                    opt_force_bg_only ? "11b/g" : "11b/g/n",
                    opt_force_ht20 ? "HT20" : "HT40");

    // CRITICAL: Completely disable all power management to prevent ASSOC_LEAVE disconnects
    WiFi.setSleep(WIFI_PS_NONE);  // Use explicit WIFI_PS_NONE instead of false
    connection_logf("DEBUG", "WiFi power management disabled (WIFI_PS_NONE)");

    // Set explicit WiFi TX power to improve signal strength and stability
    WiFi.setTxPower(WIFI_POWER_19_5dBm);  // Maximum power for better stability
    connection_logf("DEBUG", "WiFi TX power set to 19.5dBm");

    // Let the core auto-reconnect between transient losses
    WiFi.setAutoReconnect(true);

    // Subscribe to WiFi events for comprehensive diagnostics
    WiFi.onEvent(on_wifi_event);
    connection_logf("DEBUG", "WiFi event handler registered");

    reconnect_attempts = 0;
    next_retry_ms = 0;
    last_keepalive_ms = 0;  // Initialize keepalive timer
    connection_live = false;
    last_status = WL_NO_SHIELD;

    start_wifi_connect("Initial connect");
}

void wifi_monitor_loop() {
    uint32_t now_ms = millis();
    
    // Handle scheduled reconnects
    attempt_scheduled_reconnect(now_ms);
    
    // Handle connection watchdog
    handle_watchdog(now_ms);
    
    // Send periodic keepalive to prevent router timeouts
    send_wifi_keepalive(now_ms);

    wl_status_t status = WiFi.status();
    if (status == last_status) {
        return;
    }

    switch (status) {
        case WL_CONNECTED:
            connection_logf("INFO", "Connected to %s @ %s", stored_ssid, WiFi.localIP().toString().c_str());
            connection_state_transition(ConnectionState::WifiConnected, "WiFi association complete");
            connection_watchdog_stop();
            reconnect_attempts = 0;
            next_retry_ms = 0;  // Cancel any scheduled reconnect since link is healthy
            connection_live = true;
            if (on_connect_cb) {
                on_connect_cb();
            }
            break;

        case WL_DISCONNECTED:
            connection_logf("WARN", "WiFi disconnected from %s", stored_ssid);
            if (connection_live && on_disconnect_cb) {
                on_disconnect_cb();
            }
            connection_live = false;
            schedule_reconnect("WiFi disconnected", WIFI_RECONNECT_INTERVAL_MS);
            break;

        case WL_CONNECTION_LOST:
            connection_logf("ERROR", "WiFi connection lost (%s)", stored_ssid);
            if (connection_live && on_disconnect_cb) {
                on_disconnect_cb();
            }
            connection_live = false;
            schedule_reconnect("Connection lost", WIFI_RECONNECT_INTERVAL_MS);
            break;

        case WL_NO_SSID_AVAIL:
            connection_logf("ERROR", "SSID '%s' not found", stored_ssid);
            if (connection_live && on_disconnect_cb) {
                on_disconnect_cb();
            }
            connection_live = false;
            schedule_reconnect("SSID unavailable", WIFI_RECONNECT_INTERVAL_MS);
            break;

        case WL_CONNECT_FAILED:
            connection_logf("ERROR", "Failed to connect to SSID '%s'", stored_ssid);
            if (connection_live && on_disconnect_cb) {
                on_disconnect_cb();
            }
            connection_live = false;
            if (reconnect_attempts >= MAX_NETWORK_CONNECT_ATTEMPTS) {
                connection_logf("ERROR", "Max reconnect attempts reached (SSID %s)", stored_ssid);
            }
            schedule_reconnect("Connection failed", WIFI_RECONNECT_INTERVAL_MS);
            break;

        case WL_IDLE_STATUS:
            connection_state_transition(ConnectionState::WifiConnecting, "WiFi idle");
            connection_logf("DEBUG", "WiFi idle, awaiting association");
            break;

        default:
            connection_logf("ERROR", "Unhandled WiFi status change: %d", static_cast<int>(status));
            if (connection_live && on_disconnect_cb) {
                on_disconnect_cb();
            }
            connection_live = false;
            // Proactively recover on unknown states (e.g., STA off or transient)
            schedule_reconnect("Unknown status", WIFI_RECONNECT_INTERVAL_MS);
            break;
    }

    last_status = status;
}

bool wifi_monitor_is_connected() {
    return WiFi.status() == WL_CONNECTED;
}

void wifi_monitor_on_connect(wifi_connect_callback_t callback) {
    on_connect_cb = callback;
}

void wifi_monitor_on_disconnect(wifi_connect_callback_t callback) {
    on_disconnect_cb = callback;
}
