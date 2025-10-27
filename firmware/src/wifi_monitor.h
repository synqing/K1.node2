#pragma once

#include <stdint.h>

// Initialize WiFi monitor with SSID and password
void wifi_monitor_init(const char* ssid, const char* pass);

// Run monitor loop; call frequently from main loop
void wifi_monitor_loop();

// Query current WiFi connection state
bool wifi_monitor_is_connected();

// Register callbacks for connect/disconnect events
typedef void (*wifi_connect_callback_t)();
void wifi_monitor_on_connect(wifi_connect_callback_t callback);
void wifi_monitor_on_disconnect(wifi_connect_callback_t callback);

// Force immediate reassociation with a brief, non-blocking pause before disconnect
// The disconnect is scheduled in the main loop to prevent blocking and reduce packet loss.
void wifi_monitor_reassociate_now(const char* reason);

// Configurable WiFi link options
struct WifiLinkOptions {
    bool force_bg_only; // true: 11b/g only; false: 11b/g/n
    bool force_ht20;    // true: HT20; false: HT40
};

// Link options API
void wifi_monitor_set_link_options(const WifiLinkOptions& options);
void wifi_monitor_get_link_options(WifiLinkOptions& out_options);
void wifi_monitor_update_link_options(const WifiLinkOptions& options);
bool wifi_monitor_save_link_options_to_nvs(const WifiLinkOptions& options);
bool wifi_monitor_load_link_options_from_nvs(WifiLinkOptions& out_options);
