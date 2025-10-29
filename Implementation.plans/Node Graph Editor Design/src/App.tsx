import React, { useState } from 'react';
import { Canvas } from './components/prism/Canvas';
import { NodeCard } from './components/prism/NodeCard';
import { Wire } from './components/prism/Wire';
import { CompilationPanel } from './components/prism/CompilationPanel';
import { DesignSystemShowcase } from './components/prism/DesignSystemShowcase';

export default function App() {
  const [selectedNode, setSelectedNode] = useState<string | null>('spectrum');
  const [showDesignSystem, setShowDesignSystem] = useState(true);

  // Node positions for wire calculations
  const nodePositions = {
    // Column 1: Audio Input (Heavy nodes)
    beat: { x: 100, y: 80 },
    spectrum: { x: 100, y: 280 },
    audioGain: { x: 100, y: 480 },
    
    // Column 2: Processing (Mixed)
    timePulse: { x: 450, y: 80 },
    position: { x: 450, y: 280 },
    multiply: { x: 450, y: 480 },
    
    // Column 3: Color Generation (Light nodes)
    colorMix: { x: 800, y: 180 },
    palette: { x: 800, y: 380 },
    
    // Column 4: Output (Heavy node)
    output: { x: 1120, y: 280 },
  };

  // Port positions (calculated based on node position + port offsets)
  const portOffset = {
    left: -6,
    right: 280 - 6, // node width (280px) - port offset
    vertical: 70, // approximate center of node content
  };

  const getPortPosition = (nodeKey: keyof typeof nodePositions, side: 'left' | 'right', offset = 0) => {
    const node = nodePositions[nodeKey];
    return {
      x: node.x + (side === 'left' ? portOffset.left : portOffset.right),
      y: node.y + portOffset.vertical + offset,
    };
  };

  return (
    <Canvas>
      {/* Design System Toggle */}
      <button
        onClick={() => setShowDesignSystem(!showDesignSystem)}
        className="fixed top-4 left-4 z-50 px-4 py-2 rounded-lg font-rama transition-all"
        style={{
          fontSize: '12px',
          backgroundColor: 'rgba(255, 184, 77, 0.15)',
          color: '#ffb84d',
          border: '1px solid rgba(255, 184, 77, 0.3)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {showDesignSystem ? 'Hide' : 'Show'} Design System
      </button>

      {/* Design System Showcase */}
      {showDesignSystem && <DesignSystemShowcase />}

      {/* Node Graph */}
      <div className="relative w-full h-full p-8">
        {/* Wires Layer (behind nodes) */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Beat Detector → Color Mix */}
          <Wire
            from={getPortPosition('beat', 'right')}
            to={getPortPosition('colorMix', 'left', -30)}
            type="scalar"
          />

          {/* Spectrum Range → Color Mix */}
          <Wire
            from={getPortPosition('spectrum', 'right')}
            to={getPortPosition('colorMix', 'left')}
            type="scalar"
            selected={selectedNode === 'spectrum'}
            highlighted={selectedNode === 'spectrum'}
          />

          {/* Audio Gain → Multiply */}
          <Wire
            from={getPortPosition('audioGain', 'right')}
            to={getPortPosition('multiply', 'left', -20)}
            type="scalar"
          />

          {/* Position Gradient → Color Mix */}
          <Wire
            from={getPortPosition('position', 'right')}
            to={getPortPosition('colorMix', 'left', 30)}
            type="field"
          />

          {/* Time Pulse → Position Gradient */}
          <Wire
            from={getPortPosition('timePulse', 'right')}
            to={getPortPosition('position', 'left')}
            type="scalar"
          />

          {/* Multiply → Palette */}
          <Wire
            from={getPortPosition('multiply', 'right')}
            to={getPortPosition('palette', 'left')}
            type="scalar"
          />

          {/* Palette → Output */}
          <Wire
            from={getPortPosition('palette', 'right')}
            to={getPortPosition('output', 'left', 20)}
            type="color"
          />

          {/* Color Mix → Output */}
          <Wire
            from={getPortPosition('colorMix', 'right')}
            to={getPortPosition('output', 'left', -20)}
            type="color"
          />
        </div>

        {/* Nodes Layer */}
        {/* Column 1: Audio Processing (Heavy) */}
        <NodeCard
          title="BEAT DETECTOR"
          description="Detects beats and outputs tempo-synced pulses"
          parameters={[
            { label: 'sensitivity', value: '0.75' },
            { label: 'tempo_bin', value: '-1' },
          ]}
          outputPorts={[
            { type: 'scalar', connected: true, alignWith: 0 },
          ]}
          cost="heavy"
          style={{
            position: 'absolute',
            left: `${nodePositions.beat.x}px`,
            top: `${nodePositions.beat.y}px`,
          }}
        />

        <NodeCard
          title="SPECTRUM RANGE"
          description="Bass frequency range (20-250 Hz)"
          parameters={[
            { label: 'band', value: 'low' },
            { label: 'smoothing', value: '0.85' },
          ]}
          outputPorts={[
            { type: 'scalar', connected: true, alignWith: 0 },
          ]}
          cost="heavy"
          selected={selectedNode === 'spectrum'}
          style={{
            position: 'absolute',
            left: `${nodePositions.spectrum.x}px`,
            top: `${nodePositions.spectrum.y}px`,
          }}
        />

        <NodeCard
          title="AUDIO GAIN"
          description="FFT amplitude analysis with configurable windowing"
          parameters={[
            { label: 'window', value: 'hann' },
            { label: 'gain', value: '2.5' },
          ]}
          outputPorts={[
            { type: 'scalar', connected: true, alignWith: 1 },
          ]}
          cost="heavy"
          style={{
            position: 'absolute',
            left: `${nodePositions.audioGain.x}px`,
            top: `${nodePositions.audioGain.y}px`,
          }}
        />

        {/* Column 2: Processing (Mixed) */}
        <NodeCard
          title="TIME PULSE"
          description="Generates rhythmic timing pulse"
          parameters={[
            { label: 'bpm', value: '128' },
            { label: 'division', value: '1/4' },
          ]}
          outputPorts={[
            { type: 'scalar', connected: true, alignWith: 0 },
          ]}
          cost="light"
          style={{
            position: 'absolute',
            left: `${nodePositions.timePulse.x}px`,
            top: `${nodePositions.timePulse.y}px`,
          }}
        />

        <NodeCard
          title="POSITION GRADIENT"
          description="Maps distance from center (0.0 at center to 1.0 at edges)"
          parameters={[
            { label: 'origin', value: 'center' },
            { label: 'falloff', value: 'linear' },
          ]}
          inputPorts={[
            { type: 'scalar', connected: true, alignWith: 0 },
          ]}
          outputPorts={[
            { type: 'field', connected: true, alignWith: 1 },
          ]}
          cost="light"
          style={{
            position: 'absolute',
            left: `${nodePositions.position.x}px`,
            top: `${nodePositions.position.y}px`,
          }}
        />

        <NodeCard
          title="MULTIPLY"
          description="Multiplies two scalar values"
          parameters={[
            { label: 'factor', value: '1.0' },
          ]}
          inputPorts={[
            { type: 'scalar', connected: true, alignWith: 0 },
          ]}
          outputPorts={[
            { type: 'scalar', connected: true, alignWith: 0 },
          ]}
          cost="light"
          style={{
            position: 'absolute',
            left: `${nodePositions.multiply.x}px`,
            top: `${nodePositions.multiply.y}px`,
          }}
        />

        {/* Column 3: Color Generation (Light) */}
        <NodeCard
          title="COLOR MIXER"
          description="Blends colors based on audio and spatial data"
          parameters={[
            { label: 'base_hue', value: '180' },
            { label: 'saturation', value: '0.90' },
            { label: 'mode', value: 'hsv' },
          ]}
          inputPorts={[
            { type: 'scalar', connected: true, alignWith: 0 },
            { type: 'scalar', connected: true, alignWith: 1 },
            { type: 'field', connected: true, alignWith: 2 },
          ]}
          outputPorts={[
            { type: 'color', connected: true, alignWith: 2 },
          ]}
          cost="light"
          hasError={true}
          errorCount={1}
          style={{
            position: 'absolute',
            left: `${nodePositions.colorMix.x}px`,
            top: `${nodePositions.colorMix.y}px`,
          }}
        />

        <NodeCard
          title="PALETTE INTERPOLATE"
          description="Interpolates between predefined color palette entries"
          parameters={[
            { label: 'palette', value: 'sunset' },
            { label: 'wrap', value: 'true' },
          ]}
          inputPorts={[
            { type: 'scalar', connected: true, alignWith: 0 },
          ]}
          outputPorts={[
            { type: 'color', connected: true, alignWith: 1 },
          ]}
          cost="light"
          style={{
            position: 'absolute',
            left: `${nodePositions.palette.x}px`,
            top: `${nodePositions.palette.y}px`,
          }}
        />

        {/* Column 4: Output (Heavy) */}
        <NodeCard
          title="LED OUTPUT"
          description="Final compiled pattern sent to K1 Lightwave hardware"
          parameters={[
            { label: 'strip_length', value: '144' },
            { label: 'fps_target', value: '120' },
          ]}
          inputPorts={[
            { type: 'color', connected: true, alignWith: 0 },
            { type: 'color', connected: true, alignWith: 1 },
          ]}
          cost="heavy"
          style={{
            position: 'absolute',
            left: `${nodePositions.output.x}px`,
            top: `${nodePositions.output.y}px`,
          }}
        />
      </div>

      {/* Compilation Feedback Panel */}
      <CompilationPanel
        status="warning"
        nodeCount={9}
        edgeCount={8}
        outdegreeMin={0}
        outdegreeMax={3}
        outdegreeAvg={1.3}
        isDAG={true}
        predictedTime={7.42}
        cpuUsage={67}
        topoTime={0.12}
        errorCount={1}
        errors={[
          'COLOR MIXER: saturation parameter exceeds recommended range (0.0-0.8)',
        ]}
        changedNodes={['SPECTRUM RANGE', 'COLOR MIXER']}
        impactedNodes={['COLOR MIXER', 'PALETTE INTERPOLATE', 'LED OUTPUT']}
      />
    </Canvas>
  );
}
