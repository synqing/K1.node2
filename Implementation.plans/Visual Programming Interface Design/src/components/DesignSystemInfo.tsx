import React, { useState } from 'react';
import { X, Info } from 'lucide-react';

export const DesignSystemInfo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="design-info-toggle"
        title="View Design System Information"
      >
        <Info size={20} />
      </button>
    );
  }
  
  return (
    <div className="design-info-panel">
      <div className="design-info-content">
        <div className="design-info-header">
          <h2>PRISM.NODE DESIGN SYSTEM</h2>
          <button onClick={() => setIsOpen(false)} className="design-info-close">
            <X size={20} />
          </button>
        </div>
        
        <div className="design-info-section">
          <h3>Glass Material Physics</h3>
          <p>
            <strong>Single Light Source:</strong> All glass effects follow a single directional light 
            from top-left (20%, 20%) at 45°. This creates consistent, believable materials.
          </p>
          <p>
            <strong>Beer-Lambert Law:</strong> Glass thickness communicates computational cost:
          </p>
          <ul>
            <li><strong>Light Nodes (20px blur):</strong> Cheap operations like position gradients</li>
            <li><strong>Heavy Nodes (40px blur):</strong> Expensive operations like FFT analysis</li>
          </ul>
          <p>
            <strong>Fresnel Edge Brightening:</strong> Glass reflects more light at grazing angles, 
            creating bright rims around edges.
          </p>
          <p>
            <strong>Environmental Reflections:</strong> Bottom-right regions pick up subtle cyan tints 
            from the LED visualization background.
          </p>
        </div>
        
        <div className="design-info-section">
          <h3>Wire Semantics</h3>
          <ul>
            <li><strong style={{ color: '#F59E0B' }}>Scalar (Orange):</strong> Single numeric values - amplitude, time, parameters</li>
            <li><strong style={{ color: '#22D3EE' }}>Field (Cyan):</strong> Positional/spatial data - distance maps, gradients</li>
            <li><strong style={{ color: '#F472B6' }}>Color (Magenta):</strong> RGB/HSV color information</li>
            <li><strong style={{ color: '#34D399' }}>Output (Green):</strong> Final render data to LEDs</li>
          </ul>
        </div>
        
        <div className="design-info-section">
          <h3>Typography System</h3>
          <ul>
            <li><strong>Bebas Neue:</strong> Headers, node type names (always uppercase)</li>
            <li><strong>Nunito Sans:</strong> Body text, descriptions, interface labels</li>
            <li><strong>JetBrains Mono:</strong> Numeric values, technical data (tabular alignment)</li>
          </ul>
        </div>
        
        <div className="design-info-section">
          <h3>Color System</h3>
          <p><strong>Canvas Background:</strong> #1C2130 (dark blue-gray)</p>
          <p><strong>Primary Action Gold:</strong> #FFB84D (from SpectraSynq logo)</p>
          <p><strong>Success:</strong> #22DD88 | <strong>Warning:</strong> #F59E0B | <strong>Error:</strong> #EF4444</p>
        </div>
        
        <div className="design-info-section">
          <h3>Interaction States</h3>
          <p>
            <strong>Hover:</strong> +4px blur, +5% brightness, subtle shadow lift (120ms tanh-linear)
          </p>
          <p>
            <strong>Selected:</strong> +8px blur, +8% brightness, gold outline (280ms tanh-snap)
          </p>
          <p>
            <strong>Error:</strong> Red pulsing outline (2s sine wave), error count badge
          </p>
        </div>
      </div>
    </div>
  );
};
