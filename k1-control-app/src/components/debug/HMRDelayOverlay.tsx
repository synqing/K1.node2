import React, { useEffect, useMemo, useState } from 'react';
import { useK1Config } from '../../providers/K1Provider';

function getUrlFlag(name: string): boolean | undefined {
  try {
    if (typeof window === 'undefined' || !window.location) return undefined;
    const val = new URLSearchParams(window.location.search).get(name);
    if (!val) return undefined;
    const v = val.toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    return undefined;
  } catch {
    return undefined;
  }
}

function getLocalStorageFlag(key: string): boolean | undefined {
  try {
    if (typeof localStorage === 'undefined') return undefined;
    const val = localStorage.getItem(key);
    if (!val) return undefined;
    const v = val.toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    return undefined;
  } catch {
    return undefined;
  }
}

export default function HMRDelayOverlay() {
  const config = useK1Config();
  const [visible, setVisible] = useState<boolean>(true);
  const [lastHotUpdate, setLastHotUpdate] = useState<number | null>(null);

  const hot = (import.meta as any).hot;
  const envDelayRaw = (import.meta as any).env?.VITE_K1_HMR_DELAY_MS;
  const envDelay = typeof envDelayRaw === 'string' ? parseInt(envDelayRaw, 10) : undefined;

  const urlShow = getUrlFlag('hmrOverlay');
  const lsShow = getLocalStorageFlag('k1.hmrOverlay');
  const showOverlay = typeof urlShow === 'boolean' ? urlShow : (typeof lsShow === 'boolean' ? lsShow : true);

  const effectiveDelay = useMemo(() => {
    return config.hmrDelayMs ?? envDelay ?? (hot ? 50 : 0);
  }, [config.hmrDelayMs, envDelay, hot]);

  useEffect(() => {
    if (!hot) return;
    // Track hot updates timing
    const start = Date.now();
    setLastHotUpdate(start);
    const dispose = () => {
      setLastHotUpdate(Date.now());
    };
    hot.dispose(dispose);
    return () => {
      try { hot.removeDispose?.(dispose); } catch {}
    };
  }, [hot]);

  if (!showOverlay || !visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 10000,
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95))',
        border: '1px solid rgba(75, 85, 99, 0.4)',
        borderRadius: 12,
        padding: '12px 14px',
        color: '#f3f4f6',
        fontSize: 13,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4), 0 4px 10px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        minWidth: 240,
        transition: 'all 0.2s ease-in-out',
        transform: 'translateZ(0)', // Force hardware acceleration
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6, 
            marginBottom: 8,
            fontWeight: 600,
            fontSize: 14,
            color: '#f9fafb'
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: hot ? 'linear-gradient(45deg, #10b981, #34d399)' : 'linear-gradient(45deg, #ef4444, #f87171)',
              boxShadow: hot ? '0 0 8px rgba(16, 185, 129, 0.4)' : '0 0 8px rgba(239, 68, 68, 0.4)',
            }} />
            HMR Status Monitor
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'auto 1fr', 
            gap: '4px 12px',
            alignItems: 'center',
            fontSize: 12,
            lineHeight: 1.4
          }}>
            <span style={{ opacity: 0.7, fontWeight: 500 }}>Status:</span>
            <span style={{ 
              color: hot ? '#34d399' : '#f87171',
              fontWeight: 600,
              textTransform: 'uppercase',
              fontSize: 11,
              letterSpacing: '0.5px'
            }}>
              {hot ? 'ACTIVE' : 'INACTIVE'}
            </span>
            
            <span style={{ opacity: 0.7, fontWeight: 500 }}>Delay:</span>
            <span style={{ 
              color: '#60a5fa',
              fontWeight: 600,
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, monospace'
            }}>
              {effectiveDelay}ms
            </span>
            
            {lastHotUpdate && (
              <>
                <span style={{ opacity: 0.7, fontWeight: 500 }}>Last Update:</span>
                <span style={{ 
                  color: '#fbbf24',
                  fontWeight: 500,
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, monospace',
                  fontSize: 11
                }}>
                  {new Date(lastHotUpdate).toLocaleTimeString()}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          aria-label="Close HMR Overlay"
          style={{
            background: 'rgba(75, 85, 99, 0.3)',
            border: '1px solid rgba(75, 85, 99, 0.4)',
            borderRadius: 6,
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: 14,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            e.currentTarget.style.color = '#f87171';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(75, 85, 99, 0.3)';
            e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.4)';
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}