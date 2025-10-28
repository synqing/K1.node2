import React, { useState } from 'react';
import { Canvas } from './components/prism/Canvas';
import { NodeCard } from './components/prism/NodeCard';
import { NodeCardCutaway } from './components/prism/NodeCardCutaway';
import { DraggableNode } from './components/prism/DraggableNode';
import { Wire } from './components/prism/Wire';
import { CompilationPanel } from './components/prism/CompilationPanel';
import { DesignSystemShowcase } from './components/prism/DesignSystemShowcase';
import { ParameterPanel } from './components/prism/ParameterPanel';
import { PreviewWindow } from './components/prism/PreviewWindow';

export default function App() {
  const [selectedNode, setSelectedNode] = useState<string | null>('spectrum');
  const [showDesignSystem, setShowDesignSystem] = useState(false);
  const [showParameterPanel, setShowParameterPanel] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [showGrid, setShowGrid] = useState(false);

  // Node positions for wire calculations (now in state for dynamic updates)
  const [nodePositions, setNodePositions] = useState({
    // Column 1: Audio Input (Heavy nodes)
    beat: { x: 120, y: 80 },
    spectrum: { x: 120, y: 280 },
    audioGain: { x: 120, y: 480 },
    
    // Column 2: Processing (Mixed)
    timePulse: { x: 480, y: 80 },
    position: { x: 480, y: 280 },
    multiply: { x: 480, y: 480 },
    
    // Column 3: Color Generation (Light nodes)
    colorMix: { x: 840, y: 200 },
    palette: { x: 840, y: 400 },
    
    // Column 4: Output (Heavy node)
    output: { x: 1160, y: 280 },
  });

  // Update node position handler
  const updateNodePosition = (nodeKey: keyof typeof nodePositions, newPosition: { x: number; y: number }) => {
    setNodePositions(prev => ({
      ...prev,
      [nodeKey]: newPosition,
    }));
  };

  // Port positions (calculated based on node position + port offsets)
  const portOffset = {
    left: -6,
    right: 280 - 6,
    vertical: 70,
  };

  const getPortPosition = (nodeKey: keyof typeof nodePositions, side: 'left' | 'right', offset = 0) => {
    const node = nodePositions[nodeKey];
    return {
      x: node.x + (side === 'left' ? portOffset.left : portOffset.right),
      y: node.y + portOffset.vertical + offset,
    };
  };

  return (
    <Canvas showGrid={showGrid}>
      {/* Toggle Controls */}
      <div className="fixed top-4 left-4 z-50 flex flex-col gap-2">
        <button
          onClick={() => setShowDesignSystem(!showDesignSystem)}
          className="px-4 py-2 rounded-lg font-rama transition-all"
          style={{
            fontSize: '12px',
            backgroundColor: showDesignSystem ? 'rgba(255, 184, 77, 0.25)' : 'rgba(255, 184, 77, 0.15)',
            color: '#ffb84d',
            border: '1px solid rgba(255, 184, 77, 0.3)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {showDesignSystem ? 'Hide' : 'Show'} Design System
        </button>
        <button
          onClick={() => setShowParameterPanel(!showParameterPanel)}
          className="px-4 py-2 rounded-lg font-rama transition-all"
          style={{
            fontSize: '12px',
            backgroundColor: showParameterPanel ? 'rgba(110, 231, 243, 0.25)' : 'rgba(110, 231, 243, 0.15)',
            color: '#6ee7f3',
            border: '1px solid rgba(110, 231, 243, 0.3)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {showParameterPanel ? 'Hide' : 'Show'} Parameters
        </button>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-4 py-2 rounded-lg font-rama transition-all"
          style={{
            fontSize: '12px',
            backgroundColor: showPreview ? 'rgba(34, 221, 136, 0.25)' : 'rgba(34, 221, 136, 0.15)',
            color: '#22dd88',
            border: '1px solid rgba(34, 221, 136, 0.3)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className="px-4 py-2 rounded-lg font-rama transition-all"
          style={{
            fontSize: '12px',
            backgroundColor: showGrid ? 'rgba(181, 189, 202, 0.25)' : 'rgba(181, 189, 202, 0.15)',
            color: '#b5bdca',
            border: '1px solid rgba(181, 189, 202, 0.3)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {showGrid ? 'Hide' : 'Show'} Grid
        </button>
      </div>

      {/* Design System Showcase */}
      {showDesignSystem && <DesignSystemShowcase />}

      {/* Parameter Panel (left side) */}
      {showParameterPanel && selectedNode === 'spectrum' && (
        <div className="fixed left-8 top-1/2 -translate-y-1/2 z-40">
          <ParameterPanel
            nodeName="SPECTRUM RANGE"
            groups={[
              {
                title: 'Audio Analysis',
                defaultExpanded: true,
                parameters: [
                  {
                    name: 'band',
                    value: 'low',
                    type: 'select',
                    options: ['low', 'mid', 'high', 'full'],
                    description: 'Frequency band to analyze',
                  },
                  {
                    name: 'smoothing',
                    value: 0.85,
                    type: 'number',
                    min: 0,
                    max: 1,
                    step: 0.05,
                    description: 'Temporal smoothing factor (0 = none, 1 = max)',
                  },
                  {
                    name: 'gain',
                    value: 1.5,
                    type: 'number',
                    min: 0.1,
                    max: 5,
                    step: 0.1,
                    description: 'Amplitude multiplier',
                  },
                ],
              },
              {
                title: 'Advanced',
                defaultExpanded: false,
                parameters: [
                  {
                    name: 'auto_gain',
                    value: 'true',
                    type: 'toggle',
                    description: 'Automatically adjust gain based on input level',
                  },
                  {
                    name: 'window_function',
                    value: 'hann',
                    type: 'select',
                    options: ['hann', 'hamming', 'blackman', 'rectangular'],
                    description: 'FFT window function',
                  },
                ],
              },
            ]}
          />
        </div>
      )}

      {/* Preview Window (bottom-left) */}
      {showPreview && (
        <div className="fixed left-8 bottom-8 z-40">
          <PreviewWindow
            title="LED PREVIEW"
            fps={120}
            resolution="144 × 1"
            isPlaying={isPreviewPlaying}
            onTogglePlay={() => setIsPreviewPlaying(!isPreviewPlaying)}
            onReset={() => {
              setIsPreviewPlaying(false);
              setTimeout(() => setIsPreviewPlaying(true), 100);
            }}
          />
        </div>
      )}

      {/* Node Graph */}
      <div className="relative w-full h-full p-8">
        {/* Wires Layer */}
        <div className="absolute inset-0 pointer-events-none">
          <Wire
            from={getPortPosition('beat', 'right')}
            to={getPortPosition('colorMix', 'left', -30)}
            type="scalar"
          />
          <Wire
            from={getPortPosition('spectrum', 'right')}
            to={getPortPosition('colorMix', 'left')}
            type="scalar"
            selected={selectedNode === 'spectrum'}
            highlighted={selectedNode === 'spectrum'}
          />
          <Wire
            from={getPortPosition('audioGain', 'right')}
            to={getPortPosition('multiply', 'left', -20)}
            type="scalar"
          />
          <Wire
            from={getPortPosition('position', 'right')}
            to={getPortPosition('colorMix', 'left', 30)}
            type="field"
          />
          <Wire
            from={getPortPosition('timePulse', 'right')}
            to={getPortPosition('position', 'left')}
            type="scalar"
          />
          <Wire
            from={getPortPosition('multiply', 'right')}
            to={getPortPosition('palette', 'left')}
            type="scalar"
          />
          <Wire
            from={getPortPosition('palette', 'right')}
            to={getPortPosition('output', 'left', 20)}
            type="color"
          />
          <Wire
            from={getPortPosition('colorMix', 'right')}
            to={getPortPosition('output', 'left', -20)}
            type="color"
          />
        </div>

        {/* Nodes Layer - Using Cutaway Node Cards wrapped in DraggableNode */}
        {/* Column 1: Audio Processing (Heavy) */}
        <DraggableNode
          id="beat"
          initialPosition={nodePositions.beat}
          gridSize={40}
          onPositionChange={(pos) => updateNodePosition('beat', pos)}
        >
          <NodeCardCutaway
            title="BEAT DETECTOR"
            description="Detects beats and outputs tempo-synced pulses"
            parameters={[
              { label: 'sensitivity', value: '0.75', editable: true },
              { label: 'tempo_bin', value: '-1', editable: true },
            ]}
            outputPorts={[
              { type: 'scalar', connected: true, alignWith: 0 },
            ]}
            cost="heavy"
            metrics={[
              { label: 'BPM', value: '128', unit: '', status: 'normal' },
            ]}
            showMetricsTab={true}
          />
        </DraggableNode>

        <DraggableNode
          id="spectrum"
          initialPosition={nodePositions.spectrum}
          gridSize={40}
          onPositionChange={(pos) => updateNodePosition('spectrum', pos)}
        >
          <NodeCardCutaway
            title="SPECTRUM RANGE"
            description="Bass frequency range (20-250 Hz)"
            parameters={[
              { label: 'band', value: 'low', editable: true },
              { label: 'smoothing', value: '0.85', editable: true },
            ]}
            outputPorts={[
              { type: 'scalar', connected: true, alignWith: 0 },
            ]}
            cost="heavy"
            selected={selectedNode === 'spectrum'}
            metrics={[
              { label: 'CPU', value: '72', unit: '%', status: 'warning' },
            ]}
            showMetricsTab={true}
          />
        </DraggableNode>

        <DraggableNode
          id="audioGain"
          initialPosition={nodePositions.audioGain}
          gridSize={40}
          onPositionChange={(pos) => updateNodePosition('audioGain', pos)}
        >
          <NodeCardCutaway
            title="AUDIO GAIN"
            description="FFT amplitude analysis with configurable windowing"
            parameters={[
              { label: 'window', value: 'hann', editable: true },
              { label: 'gain', value: '2.5', editable: true },
            ]}
            outputPorts={[
              { type: 'scalar', connected: true, alignWith: 1 },
            ]}
            cost="heavy"
            metrics={[
              { label: 'GAIN', value: '2.5x', unit: '', status: 'normal' },
            ]}
            showMetricsTab={true}
          />
        </DraggableNode>

        {/* Column 2: Processing (Light/Mixed) */}
        <DraggableNode
          id="timePulse"
          initialPosition={nodePositions.timePulse}
          gridSize={40}
          onPositionChange={(pos) => updateNodePosition('timePulse', pos)}
        >
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
          />
        </DraggableNode>

        <DraggableNode
          id="position"
          initialPosition={nodePositions.position}
          gridSize={40}
          onPositionChange={(pos) => updateNodePosition('position', pos)}
        >
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
          />
        </DraggableNode>

        <DraggableNode
          id="multiply"
          initialPosition={nodePositions.multiply}
          gridSize={40}
          onPositionChange={(pos) => updateNodePosition('multiply', pos)}
        >
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
          />
        </DraggableNode>

        {/* Column 3: Color Generation (Light) */}
        <DraggableNode
          id="colorMix"
          initialPosition={nodePositions.colorMix}
          gridSize={40}
          onPositionChange={(pos) => updateNodePosition('colorMix', pos)}
        >
          <NodeCardCutaway
            title="COLOR MIXER"
            description="Blends colors based on audio and spatial data"
            parameters={[
              { label: 'base_hue', value: '180', editable: true },
              { label: 'saturation', value: '0.90', editable: true },
              { label: 'mode', value: 'hsv', editable: true },
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
            metrics={[
              { label: 'SAT', value: '0.90', unit: '', status: 'warning' },
            ]}
            showMetricsTab={true}
          />
        </DraggableNode>

        <DraggableNode
          id="palette"
          initialPosition={nodePositions.palette}
          gridSize={40}
          onPositionChange={(pos) => updateNodePosition('palette', pos)}
        >
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
          />
        </DraggableNode>

        {/* Column 4: Output (Heavy) */}
        <DraggableNode
          id="output"
          initialPosition={nodePositions.output}
          gridSize={40}
          onPositionChange={(pos) => updateNodePosition('output', pos)}
        >
          <NodeCardCutaway
            title="LED OUTPUT"
            description="Final compiled pattern sent to K1 Lightwave hardware"
            parameters={[
              { label: 'strip_length', value: '144', editable: true },
              { label: 'fps_target', value: '120', editable: true },
            ]}
            inputPorts={[
              { type: 'color', connected: true, alignWith: 0 },
              { type: 'color', connected: true, alignWith: 1 },
            ]}
            cost="heavy"
            metrics={[
              { label: 'FPS', value: '120', unit: '', status: 'normal' },
            ]}
            showMetricsTab={true}
          />
        </DraggableNode>
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
