/**
 * Audio Permission Handler
 * Smooth UX for requesting microphone permissions with fallback options
 */

import React, { useState, useEffect } from 'react';

interface AudioPermissionHandlerProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
  children: React.ReactNode;
}

type PermissionState = 'unknown' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export const AudioPermissionHandler: React.FC<AudioPermissionHandlerProps> = ({
  onPermissionGranted,
  onPermissionDenied,
  children
}) => {
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    checkInitialPermission();
  }, []);

  const checkInitialPermission = async () => {
    // Check if Web Audio API is available
    if (!navigator.mediaDevices || !window.AudioContext) {
      setPermissionState('unavailable');
      return;
    }

    try {
      // Check current permission state
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permission.state === 'granted') {
        setPermissionState('granted');
        onPermissionGranted();
      } else if (permission.state === 'denied') {
        setPermissionState('denied');
        onPermissionDenied();
      } else {
        setPermissionState('unknown');
      }

      // Listen for permission changes
      permission.onchange = () => {
        if (permission.state === 'granted') {
          setPermissionState('granted');
          onPermissionGranted();
        } else if (permission.state === 'denied') {
          setPermissionState('denied');
          onPermissionDenied();
        }
      };
    } catch (error) {
      // Permissions API not supported, we'll handle it during getUserMedia
      setPermissionState('unknown');
    }
  };

  const requestPermission = async () => {
    setPermissionState('requesting');
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      // Permission granted - clean up the test stream
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionState('granted');
      onPermissionGranted();
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setPermissionState('denied');
      onPermissionDenied();
    }
  };

  const renderPermissionUI = () => {
    switch (permissionState) {
      case 'unavailable':
        return (
          <div className="permission-unavailable">
            <div className="permission-icon">🚫</div>
            <h3>Audio Reactivity Unavailable</h3>
            <p>
              Your browser doesn't support the required audio features for real-time music sync.
              Try using a modern browser like Chrome, Firefox, or Safari.
            </p>
            <div className="browser-recommendations">
              <strong>Recommended browsers:</strong>
              <ul>
                <li>Chrome 88+</li>
                <li>Firefox 76+</li>
                <li>Safari 14.1+</li>
                <li>Edge 88+</li>
              </ul>
            </div>
          </div>
        );

      case 'requesting':
        return (
          <div className="permission-requesting">
            <div className="permission-icon">🎤</div>
            <h3>Requesting Microphone Access</h3>
            <p>Please allow microphone access to enable audio-reactive lighting.</p>
            <div className="loading-spinner" />
          </div>
        );

      case 'denied':
        return (
          <div className="permission-denied">
            <div className="permission-icon">🔇</div>
            <h3>Microphone Access Denied</h3>
            <p>
              Audio-reactive lighting requires microphone access to analyze your music.
              You can still use manual lighting controls.
            </p>
            
            <div className="permission-help">
              <button 
                className="help-button"
                onClick={() => setShowExplanation(!showExplanation)}
              >
                Why do we need microphone access? {showExplanation ? '▼' : '▶'}
              </button>
              
              {showExplanation && (
                <div className="explanation">
                  <p>
                    <strong>Your privacy is protected:</strong>
                  </p>
                  <ul>
                    <li>Audio is processed locally in your browser</li>
                    <li>No audio data is sent to servers</li>
                    <li>Only beat detection and frequency analysis is performed</li>
                    <li>No recording or storage of audio content</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="permission-actions">
              <button 
                className="retry-button"
                onClick={requestPermission}
              >
                Try Again
              </button>
              <button 
                className="manual-mode-button"
                onClick={() => {/* Switch to manual mode */}}
              >
                Use Manual Controls
              </button>
            </div>

            <div className="browser-instructions">
              <strong>To enable microphone access:</strong>
              <ol>
                <li>Click the 🔒 or 🎤 icon in your browser's address bar</li>
                <li>Select "Allow" for microphone permissions</li>
                <li>Refresh the page</li>
              </ol>
            </div>
          </div>
        );

      case 'unknown':
        return (
          <div className="permission-request">
            <div className="permission-icon">🎵</div>
            <h3>Enable Audio-Reactive Lighting</h3>
            <p>
              Transform your lighting with real-time music synchronization.
              Your audio is processed locally for privacy.
            </p>
            
            <div className="features-preview">
              <div className="feature">
                <span className="feature-icon">🎯</span>
                <span>Beat-perfect timing (&lt;10ms latency)</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🌈</span>
                <span>Colors that match your music's mood</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🔒</span>
                <span>100% private - no data leaves your device</span>
              </div>
            </div>

            <button 
              className="enable-button"
              onClick={requestPermission}
            >
              Enable Audio Reactivity
            </button>
            
            <button 
              className="skip-button"
              onClick={() => {/* Skip to manual mode */}}
            >
              Skip for now
            </button>
          </div>
        );

      case 'granted':
        return children;

      default:
        return null;
    }
  };

  return (
    <div className="audio-permission-handler">
      {renderPermissionUI()}
    </div>
  );
};