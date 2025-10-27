# K1 User Experience Optimization Plan
## Seamless Connectivity and Intelligent Network Management

### Overview

This document outlines comprehensive user experience enhancements for the K1 wireless system, focusing on seamless roaming, intelligent client steering, automated network optimization, and advanced user-friendly features that ensure optimal connectivity and performance.

---

## 1. Seamless Roaming Implementation

### 1.1 Fast BSS Transition (802.11r)

**Objective:** Implement IEEE 802.11r for sub-50ms roaming handoffs

**Technical Implementation:**
```cpp
// Enhanced roaming manager with 802.11r support
class FastRoamingManager {
private:
    struct RoamingCandidate {
        uint8_t bssid[6];
        uint8_t channel;
        int8_t rssi_dbm;
        uint8_t load_percentage;
        uint16_t estimated_throughput_mbps;
        bool supports_11r;
        uint32_t last_seen_ms;
        float roaming_score;
    };
    
    struct RoamingThresholds {
        int8_t rssi_low_threshold_dbm = -70;
        int8_t rssi_critical_threshold_dbm = -80;
        uint8_t load_high_threshold_percent = 80;
        uint16_t throughput_low_threshold_mbps = 10;
        uint32_t scan_interval_ms = 30000;
        uint32_t roaming_hysteresis_ms = 5000;
    };
    
    RoamingThresholds thresholds_;
    std::vector<RoamingCandidate> candidates_;
    uint32_t last_scan_ms_;
    uint32_t last_roaming_ms_;
    bool roaming_in_progress_;
    
public:
    // Core roaming functions
    void scanForCandidates();
    bool shouldInitiateRoaming(const WiFiMetrics& current_metrics);
    RoamingCandidate selectBestCandidate(const WiFiMetrics& current_metrics);
    bool performFastTransition(const RoamingCandidate& target);
    
    // 802.11r specific functions
    bool negotiateFastTransition(const uint8_t* target_bssid);
    void cachePMK(const uint8_t* bssid, const uint8_t* pmk);
    bool validateR0KH(const uint8_t* bssid);
    
    // Roaming optimization
    void updateRoamingThresholds(const RoamingThresholds& thresholds);
    void optimizeRoamingParameters();
    float calculateRoamingScore(const RoamingCandidate& candidate, const WiFiMetrics& current);
    
    // Monitoring and diagnostics
    void logRoamingEvent(const String& event, const RoamingCandidate& candidate);
    RoamingStatistics getRoamingStatistics() const;
    void resetRoamingStatistics();
};

// Roaming statistics structure
struct RoamingStatistics {
    uint32_t total_roaming_attempts;
    uint32_t successful_roamings;
    uint32_t failed_roamings;
    uint16_t average_roaming_time_ms;
    uint16_t min_roaming_time_ms;
    uint16_t max_roaming_time_ms;
    float success_rate_percent;
    uint32_t last_roaming_timestamp;
    String last_roaming_reason;
};
```

### 1.2 Predictive Roaming Algorithm

**Smart Roaming Decision Engine:**
```cpp
class PredictiveRoamingEngine {
private:
    struct SignalPrediction {
        float predicted_rssi_dbm;
        float confidence_percent;
        uint32_t prediction_horizon_ms;
        bool degradation_predicted;
    };
    
    struct MovementPattern {
        float velocity_mps;          // meters per second
        float direction_degrees;     // 0-360 degrees
        uint32_t pattern_confidence; // 0-100%
        bool is_stationary;
    };
    
    // Historical data for prediction
    std::vector<WiFiMetrics> signal_history_;
    MovementPattern current_movement_;
    
public:
    SignalPrediction predictSignalStrength(uint32_t future_ms);
    MovementPattern analyzeMovementPattern();
    bool shouldPreemptivelyRoam();
    void updateMovementData(const WiFiMetrics& metrics);
    
private:
    float calculateSignalTrend();
    float estimateDistanceFromAP(int8_t rssi_dbm);
    bool detectMovementDirection();
    float calculatePredictionConfidence();
};
```

### 1.3 Seamless Authentication Handoff

**Pre-authentication and Key Caching:**
```cpp
class AuthenticationManager {
private:
    struct CachedCredentials {
        uint8_t bssid[6];
        uint8_t pmk[32];        // Pairwise Master Key
        uint8_t pmkid[16];      // PMK Identifier
        uint32_t expiry_timestamp;
        bool is_valid;
    };
    
    std::map<String, CachedCredentials> credential_cache_;
    
public:
    bool preAuthenticateWithAP(const uint8_t* target_bssid);
    void cacheAuthenticationData(const uint8_t* bssid, const uint8_t* pmk);
    bool hasCachedCredentials(const uint8_t* bssid);
    void cleanupExpiredCredentials();
    
    // Fast reconnection using cached credentials
    bool fastReconnect(const uint8_t* bssid);
    void invalidateCredentials(const uint8_t* bssid);
};
```

---

## 2. Intelligent Client Steering

### 2.1 Multi-Band Steering Algorithm

**Advanced Band Selection Logic:**
```cpp
class IntelligentBandSteering {
private:
    struct BandMetrics {
        wifi_band_t band;
        float utilization_percent;
        int8_t noise_floor_dbm;
        uint16_t active_clients;
        uint32_t available_bandwidth_mbps;
        float interference_level;
        bool supports_client_capabilities;
    };
    
    struct ClientCapabilities {
        bool supports_5ghz;
        bool supports_6ghz;
        bool supports_wifi6;
        bool supports_wifi7;
        uint8_t max_spatial_streams;
        uint16_t max_phy_rate_mbps;
        bool supports_beamforming;
    };
    
    struct SteeringDecision {
        wifi_band_t recommended_band;
        uint8_t confidence_percent;
        String reasoning;
        bool force_steering;
        uint32_t retry_delay_ms;
    };
    
public:
    SteeringDecision evaluateOptimalBand(const ClientCapabilities& client_caps,
                                       const WiFiMetrics& current_metrics);
    
    void updateBandMetrics();
    bool shouldSteerClient(const uint8_t* client_mac);
    void implementBandSteering(const uint8_t* client_mac, wifi_band_t target_band);
    
private:
    float calculateBandScore(const BandMetrics& band, const ClientCapabilities& client);
    bool isClientSteeringCandidate(const uint8_t* client_mac);
    void sendSteeringRecommendation(const uint8_t* client_mac, wifi_band_t band);
};
```

### 2.2 Load Balancing and AP Steering

**Dynamic Load Distribution:**
```cpp
class LoadBalancingManager {
private:
    struct APLoadMetrics {
        uint8_t ap_id;
        uint8_t bssid[6];
        uint16_t client_count;
        float cpu_utilization_percent;
        float memory_utilization_percent;
        uint32_t throughput_mbps;
        int8_t average_client_rssi_dbm;
        bool is_overloaded;
        uint32_t last_update_ms;
    };
    
    struct LoadBalancingPolicy {
        uint8_t max_clients_per_ap = 50;
        float cpu_threshold_percent = 80.0f;
        float memory_threshold_percent = 85.0f;
        uint32_t throughput_threshold_mbps = 100;
        int8_t min_client_rssi_dbm = -75;
        bool enable_proactive_balancing = true;
    };
    
    std::vector<APLoadMetrics> ap_metrics_;
    LoadBalancingPolicy policy_;
    
public:
    uint8_t selectOptimalAP(const ClientCapabilities& client_caps,
                           const int8_t* rssi_per_ap);
    
    void redistributeClients();
    bool isAPOverloaded(uint8_t ap_id);
    void updateLoadBalancingPolicy(const LoadBalancingPolicy& policy);
    
    // Client migration
    bool migrateClient(const uint8_t* client_mac, uint8_t target_ap_id);
    void scheduleClientMigration(const uint8_t* client_mac, uint32_t delay_ms);
    
private:
    float calculateAPScore(const APLoadMetrics& ap, const ClientCapabilities& client);
    void identifyOverloadedAPs();
    std::vector<uint8_t> findMigrationCandidates(uint8_t overloaded_ap_id);
};
```

---

## 3. User-Friendly Authentication

### 3.1 Captive Portal Enhancement

**Modern, Responsive Captive Portal:**
```cpp
class EnhancedCaptivePortal {
private:
    struct PortalConfig {
        String portal_title = "K1 Network Access";
        String welcome_message = "Welcome to K1 Wireless Network";
        String company_logo_url = "/assets/k1_logo.svg";
        String background_image_url = "/assets/portal_bg.jpg";
        String primary_color = "#2196F3";
        String accent_color = "#FF5722";
        
        // Authentication options
        bool enable_guest_access = true;
        bool enable_social_login = true;
        bool enable_voucher_system = false;
        bool require_email = false;
        bool require_phone = false;
        bool require_terms_acceptance = true;
        
        // Session settings
        uint32_t guest_session_duration_minutes = 240;  // 4 hours
        uint32_t authenticated_session_duration_minutes = 1440;  // 24 hours
        bool enable_auto_reconnect = true;
        
        // Customization
        std::vector<String> custom_fields;
        String terms_of_service_url = "";
        String privacy_policy_url = "";
        String support_contact = "support@k1network.com";
    };
    
    PortalConfig config_;
    std::map<String, UserSession> active_sessions_;
    
public:
    void displayPortal(const ClientInfo& client);
    bool authenticateUser(const UserCredentials& credentials);
    void grantNetworkAccess(const String& session_id, uint32_t duration_minutes);
    void revokeNetworkAccess(const String& session_id);
    
    // Social authentication
    bool authenticateWithGoogle(const String& oauth_token);
    bool authenticateWithFacebook(const String& oauth_token);
    bool authenticateWithApple(const String& oauth_token);
    
    // Guest access
    String generateGuestAccess(const ClientInfo& client);
    bool validateGuestSession(const String& session_id);
    
    // Voucher system
    String generateVoucher(uint32_t duration_minutes, uint8_t max_uses = 1);
    bool redeemVoucher(const String& voucher_code, const ClientInfo& client);
    
    // Analytics and reporting
    PortalAnalytics getPortalAnalytics() const;
    void trackUserBehavior(const String& session_id, const String& action);
    
private:
    String generatePortalHTML(const ClientInfo& client);
    String generateMobileOptimizedPortal(const ClientInfo& client);
    bool validateUserInput(const UserCredentials& credentials);
    void logAuthenticationAttempt(const ClientInfo& client, bool success);
};

// Portal analytics structure
struct PortalAnalytics {
    uint32_t total_portal_views;
    uint32_t successful_authentications;
    uint32_t failed_authentications;
    uint32_t guest_access_uses;
    uint32_t social_login_uses;
    float average_authentication_time_seconds;
    std::map<String, uint32_t> device_type_breakdown;
    std::map<String, uint32_t> authentication_method_breakdown;
};
```

### 3.2 Automatic Device Recognition

**Smart Device Profiling:**
```cpp
class DeviceRecognitionEngine {
private:
    struct DeviceProfile {
        uint8_t mac_address[6];
        String device_name;
        String manufacturer;
        String device_type;  // smartphone, laptop, tablet, iot, etc.
        String os_type;      // iOS, Android, Windows, macOS, Linux
        String user_agent;
        
        // Capabilities
        ClientCapabilities wifi_capabilities;
        
        // Behavior patterns
        std::vector<uint32_t> typical_connection_times;
        std::vector<String> frequently_accessed_services;
        uint32_t average_session_duration_minutes;
        
        // Trust level
        uint8_t trust_score;  // 0-100
        bool is_trusted_device;
        bool auto_connect_enabled;
        
        // Last seen information
        uint32_t last_seen_timestamp;
        uint32_t total_connections;
        String last_connection_location;
    };
    
    std::map<String, DeviceProfile> known_devices_;
    
public:
    DeviceProfile identifyDevice(const uint8_t* mac_address, const String& user_agent);
    void updateDeviceProfile(const uint8_t* mac_address, const ConnectionMetrics& metrics);
    bool isTrustedDevice(const uint8_t* mac_address);
    
    // Automatic authentication for trusted devices
    bool shouldAutoAuthenticate(const uint8_t* mac_address);
    void enableAutoConnect(const uint8_t* mac_address, bool enable = true);
    
    // Device categorization
    String categorizeDevice(const DeviceProfile& profile);
    QoSPolicy getRecommendedQoSPolicy(const DeviceProfile& profile);
    
    // Privacy and security
    void anonymizeDeviceData(DeviceProfile& profile);
    void purgeOldDeviceData(uint32_t retention_days = 90);
    
private:
    String extractManufacturer(const uint8_t* mac_address);
    String parseUserAgent(const String& user_agent);
    uint8_t calculateTrustScore(const DeviceProfile& profile);
    bool detectDeviceType(const DeviceProfile& profile);
};
```

---

## 4. Connection Optimization

### 4.1 Intelligent Connection Management

**Smart Connection Algorithms:**
```cpp
class ConnectionOptimizer {
private:
    struct ConnectionProfile {
        String ssid;
        uint8_t bssid[6];
        wifi_auth_mode_t auth_mode;
        uint8_t channel;
        wifi_band_t band;
        
        // Performance history
        std::vector<float> throughput_history_mbps;
        std::vector<uint16_t> latency_history_ms;
        std::vector<float> packet_loss_history_percent;
        
        // Connection reliability
        uint32_t successful_connections;
        uint32_t failed_connections;
        uint32_t average_connection_time_ms;
        float reliability_score;
        
        // User preferences
        uint8_t user_priority;  // 1-10 scale
        bool auto_connect;
        bool metered_connection;
    };
    
    std::vector<ConnectionProfile> saved_networks_;
    ConnectionProfile* current_connection_;
    
public:
    ConnectionProfile selectBestNetwork(const std::vector<ScanResult>& available_networks);
    void optimizeConnectionParameters();
    bool shouldSwitchNetwork();
    
    // Connection quality monitoring
    void monitorConnectionQuality();
    void adaptToNetworkConditions();
    bool detectNetworkCongestion();
    
    // Automatic network switching
    void enableIntelligentSwitching(bool enable = true);
    void setNetworkPriority(const String& ssid, uint8_t priority);
    
private:
    float calculateNetworkScore(const ConnectionProfile& profile, const ScanResult& scan);
    void updateConnectionHistory(const NetworkMetrics& metrics);
    bool isNetworkPerformanceDegraded();
    void optimizeChannelWidth();
    void adjustTxPowerForOptimalPerformance();
};
```

### 4.2 Adaptive Quality of Service

**Dynamic QoS Management:**
```cpp
class AdaptiveQoSManager {
private:
    struct ApplicationProfile {
        String app_name;
        String app_category;  // streaming, gaming, voip, web, file_transfer
        TrafficClass default_class;
        
        // Traffic characteristics
        uint32_t typical_bandwidth_kbps;
        uint16_t latency_sensitivity_ms;
        float packet_loss_tolerance_percent;
        bool requires_guaranteed_bandwidth;
        
        // Adaptive parameters
        bool enable_adaptive_qos;
        float priority_boost_factor;
        uint32_t burst_allowance_kb;
    };
    
    struct QoSRule {
        String rule_name;
        TrafficClass traffic_class;
        uint16_t src_port_min;
        uint16_t src_port_max;
        uint16_t dst_port_min;
        uint16_t dst_port_max;
        String protocol;  // TCP, UDP, ICMP
        IPAddress src_ip_range_start;
        IPAddress src_ip_range_end;
        IPAddress dst_ip_range_start;
        IPAddress dst_ip_range_end;
        
        // QoS parameters
        uint32_t guaranteed_bandwidth_kbps;
        uint32_t max_bandwidth_kbps;
        uint16_t max_latency_ms;
        float max_packet_loss_percent;
        uint8_t dscp_marking;
        
        bool is_active;
        uint32_t packets_matched;
        uint32_t bytes_matched;
    };
    
    std::vector<ApplicationProfile> app_profiles_;
    std::vector<QoSRule> qos_rules_;
    
public:
    void classifyTraffic(const PacketInfo& packet, TrafficClass& out_class);
    void applyQoSPolicy(const PacketInfo& packet, const TrafficClass& traffic_class);
    void adaptQoSBasedOnConditions();
    
    // Application-aware QoS
    void registerApplication(const ApplicationProfile& app_profile);
    void updateApplicationRequirements(const String& app_name, const ApplicationProfile& profile);
    TrafficClass getApplicationTrafficClass(const String& app_name);
    
    // Dynamic adaptation
    void monitorNetworkConditions();
    void adjustQoSPolicies();
    bool detectCongestion();
    void implementCongestionControl();
    
    // User experience optimization
    void prioritizeInteractiveTraffic();
    void deprioritizeBackgroundTraffic();
    void guaranteeBandwidthForCriticalApps();
    
private:
    ApplicationProfile identifyApplication(const PacketInfo& packet);
    void updateTrafficStatistics(const PacketInfo& packet, const TrafficClass& traffic_class);
    float calculateNetworkUtilization();
    void rebalanceQoSAllocations();
};
```

---

## 5. User Interface Enhancements

### 5.1 Mobile-First Dashboard

**Responsive Web Interface:**
```html
<!-- Enhanced Mobile Dashboard -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K1 Network Dashboard</title>
    <style>
        /* Mobile-first responsive design */
        :root {
            --primary-color: #2196F3;
            --secondary-color: #FF5722;
            --success-color: #4CAF50;
            --warning-color: #FF9800;
            --error-color: #F44336;
            --background-color: #121212;
            --surface-color: #1E1E1E;
            --text-primary: #FFFFFF;
            --text-secondary: #B0B0B0;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--background-color);
            color: var(--text-primary);
            line-height: 1.6;
        }
        
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 0;
            border-bottom: 1px solid var(--surface-color);
            margin-bottom: 2rem;
        }
        
        .connection-status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--success-color);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .metric-card {
            background: var(--surface-color);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s ease;
        }
        
        .metric-card:hover {
            transform: translateY(-2px);
        }
        
        .metric-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .metric-title {
            font-size: 0.9rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary-color);
        }
        
        .metric-unit {
            font-size: 1rem;
            color: var(--text-secondary);
            margin-left: 0.5rem;
        }
        
        .metric-trend {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.8rem;
            margin-top: 0.5rem;
        }
        
        .trend-up { color: var(--success-color); }
        .trend-down { color: var(--error-color); }
        .trend-stable { color: var(--text-secondary); }
        
        .controls-section {
            background: var(--surface-color);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .control-group {
            margin-bottom: 1.5rem;
        }
        
        .control-label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
        
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
        }
        
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 34px;
        }
        
        .slider:before {
            position: absolute;
            content: "";
            height: 26px;
            width: 26px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        
        input:checked + .slider {
            background-color: var(--primary-color);
        }
        
        input:checked + .slider:before {
            transform: translateX(26px);
        }
        
        .network-map {
            background: var(--surface-color);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .ap-indicator {
            display: inline-block;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--primary-color);
            color: white;
            text-align: center;
            line-height: 40px;
            margin: 0.5rem;
            position: relative;
        }
        
        .ap-indicator.active {
            background: var(--success-color);
            box-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
        }
        
        .signal-strength {
            position: absolute;
            top: -5px;
            right: -5px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--warning-color);
            font-size: 0.7rem;
            line-height: 20px;
        }
        
        @media (max-width: 768px) {
            .dashboard {
                padding: 0.5rem;
            }
            
            .metrics-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }
            
            .metric-card {
                padding: 1rem;
            }
            
            .metric-value {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <header class="header">
            <h1>K1 Network</h1>
            <div class="connection-status">
                <div class="status-indicator"></div>
                <span id="connection-status">Connected</span>
            </div>
        </header>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-title">Signal Strength</span>
                    <span class="metric-icon">📶</span>
                </div>
                <div class="metric-value" id="signal-strength">-45<span class="metric-unit">dBm</span></div>
                <div class="metric-trend trend-up">↗ Excellent</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-title">Throughput</span>
                    <span class="metric-icon">⚡</span>
                </div>
                <div class="metric-value" id="throughput">87<span class="metric-unit">Mbps</span></div>
                <div class="metric-trend trend-up">↗ +12% from avg</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-title">Latency</span>
                    <span class="metric-icon">⏱️</span>
                </div>
                <div class="metric-value" id="latency">8<span class="metric-unit">ms</span></div>
                <div class="metric-trend trend-stable">→ Stable</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-title">Packet Loss</span>
                    <span class="metric-icon">📦</span>
                </div>
                <div class="metric-value" id="packet-loss">0.1<span class="metric-unit">%</span></div>
                <div class="metric-trend trend-down">↘ Improving</div>
            </div>
        </div>
        
        <div class="controls-section">
            <h2>Network Controls</h2>
            
            <div class="control-group">
                <label class="control-label">
                    Force 802.11b/g Only
                    <label class="toggle-switch">
                        <input type="checkbox" id="force-bg-only" checked>
                        <span class="slider"></span>
                    </label>
                </label>
            </div>
            
            <div class="control-group">
                <label class="control-label">
                    Force HT20 Bandwidth
                    <label class="toggle-switch">
                        <input type="checkbox" id="force-ht20" checked>
                        <span class="slider"></span>
                    </label>
                </label>
            </div>
            
            <div class="control-group">
                <label class="control-label">
                    Intelligent Roaming
                    <label class="toggle-switch">
                        <input type="checkbox" id="intelligent-roaming">
                        <span class="slider"></span>
                    </label>
                </label>
            </div>
        </div>
        
        <div class="network-map">
            <h2>Network Topology</h2>
            <div class="ap-container">
                <div class="ap-indicator active">
                    AP1
                    <div class="signal-strength">-45</div>
                </div>
                <div class="ap-indicator">
                    AP2
                    <div class="signal-strength">-67</div>
                </div>
                <div class="ap-indicator">
                    AP3
                    <div class="signal-strength">-72</div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Enhanced dashboard JavaScript
        class K1Dashboard {
            constructor() {
                this.updateInterval = 1000; // 1 second
                this.isConnected = true;
                this.metrics = {};
                
                this.initializeEventListeners();
                this.startMetricsUpdates();
            }
            
            initializeEventListeners() {
                // Toggle switches
                document.getElementById('force-bg-only').addEventListener('change', (e) => {
                    this.updateWiFiLinkOptions();
                });
                
                document.getElementById('force-ht20').addEventListener('change', (e) => {
                    this.updateWiFiLinkOptions();
                });
                
                document.getElementById('intelligent-roaming').addEventListener('change', (e) => {
                    this.updateRoamingSettings();
                });
                
                // Handle visibility change for battery optimization
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) {
                        this.updateInterval = 5000; // Slow down when hidden
                    } else {
                        this.updateInterval = 1000; // Speed up when visible
                    }
                });
            }
            
            async startMetricsUpdates() {
                while (true) {
                    try {
                        await this.updateMetrics();
                        await this.updateConnectionStatus();
                    } catch (error) {
                        console.error('Failed to update metrics:', error);
                        this.handleConnectionError();
                    }
                    
                    await this.sleep(this.updateInterval);
                }
            }
            
            async updateMetrics() {
                const response = await fetch('/api/metrics');
                if (!response.ok) throw new Error('Failed to fetch metrics');
                
                const metrics = await response.json();
                this.metrics = metrics;
                
                // Update UI elements
                this.updateMetricDisplay('signal-strength', metrics.signal_strength_dbm, 'dBm');
                this.updateMetricDisplay('throughput', Math.round(metrics.throughput_mbps), 'Mbps');
                this.updateMetricDisplay('latency', metrics.latency_ms, 'ms');
                this.updateMetricDisplay('packet-loss', metrics.packet_loss_percent.toFixed(1), '%');
                
                // Update trends
                this.updateTrends(metrics);
            }
            
            updateMetricDisplay(elementId, value, unit) {
                const element = document.getElementById(elementId);
                if (element) {
                    element.innerHTML = `${value}<span class="metric-unit">${unit}</span>`;
                }
            }
            
            updateTrends(metrics) {
                // Implement trend calculation and display
                // This would compare current values with historical data
            }
            
            async updateConnectionStatus() {
                const statusElement = document.getElementById('connection-status');
                const indicator = document.querySelector('.status-indicator');
                
                if (this.isConnected) {
                    statusElement.textContent = 'Connected';
                    indicator.style.background = 'var(--success-color)';
                } else {
                    statusElement.textContent = 'Disconnected';
                    indicator.style.background = 'var(--error-color)';
                }
            }
            
            async updateWiFiLinkOptions() {
                const forceBgOnly = document.getElementById('force-bg-only').checked;
                const forceHt20 = document.getElementById('force-ht20').checked;
                
                try {
                    const response = await fetch('/api/wifi/link-options', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            force_bg_only: forceBgOnly,
                            force_ht20: forceHt20
                        })
                    });
                    
                    if (!response.ok) throw new Error('Failed to update link options');
                    
                    this.showNotification('WiFi settings updated successfully', 'success');
                } catch (error) {
                    console.error('Failed to update WiFi settings:', error);
                    this.showNotification('Failed to update WiFi settings', 'error');
                }
            }
            
            async updateRoamingSettings() {
                const intelligentRoaming = document.getElementById('intelligent-roaming').checked;
                
                try {
                    const response = await fetch('/api/roaming/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            intelligent_roaming: intelligentRoaming
                        })
                    });
                    
                    if (!response.ok) throw new Error('Failed to update roaming settings');
                    
                    this.showNotification('Roaming settings updated successfully', 'success');
                } catch (error) {
                    console.error('Failed to update roaming settings:', error);
                    this.showNotification('Failed to update roaming settings', 'error');
                }
            }
            
            showNotification(message, type = 'info') {
                // Create and show notification
                const notification = document.createElement('div');
                notification.className = `notification notification-${type}`;
                notification.textContent = message;
                
                document.body.appendChild(notification);
                
                // Auto-remove after 3 seconds
                setTimeout(() => {
                    notification.remove();
                }, 3000);
            }
            
            handleConnectionError() {
                this.isConnected = false;
                this.showNotification('Connection lost - attempting to reconnect', 'warning');
            }
            
            sleep(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
        }
        
        // Initialize dashboard when page loads
        document.addEventListener('DOMContentLoaded', () => {
            new K1Dashboard();
        });
    </script>
</body>
</html>
```

This comprehensive user experience optimization plan transforms the K1 wireless system into an intelligent, user-friendly network that automatically adapts to user needs, provides seamless connectivity, and offers an intuitive management interface. The implementation focuses on reducing user friction while maximizing network performance and reliability.