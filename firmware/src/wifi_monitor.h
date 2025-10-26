#pragma once

#include <Arduino.h>

typedef void (*wifi_connect_callback_t)();

// Configurable WiFi link options
struct WifiLinkOptions {
    bool force_bg_only; // true: 11b/g only; false: 11b/g/n
    bool force_ht20;    // true: HT20; false: HT40
};

// Set link options before calling wifi_monitor_init()
void wifi_monitor_set_link_options(const WifiLinkOptions& options);

// Retrieve current link options
void wifi_monitor_get_link_options(WifiLinkOptions& out_options);

// Update link options at runtime and apply immediately
void wifi_monitor_update_link_options(const WifiLinkOptions& options);

// Persist and load link options to/from NVS
bool wifi_monitor_save_link_options_to_nvs(const WifiLinkOptions& options);
bool wifi_monitor_load_link_options_from_nvs(WifiLinkOptions& out_options);

void wifi_monitor_init(const char* ssid, const char* pass);
void wifi_monitor_loop();
bool wifi_monitor_is_connected();

void wifi_monitor_on_connect(wifi_connect_callback_t callback);
void wifi_monitor_on_disconnect(wifi_connect_callback_t callback);
