import React, { useState } from 'react';
import { NodeCard, PortConfig, Parameter } from './components/NodeCard';
import { Wire } from './components/Wire';
import { CompilationPanel } from './components/CompilationPanel';
import { LEDPreview } from './components/LEDPreview';
import { DesignSystemInfo } from './components/DesignSystemInfo';
import './styles/prism.css';

interface NodeData {
  id: string;
  name: string;
  description: string;
  weight: 'light' | 'heavy';
  x: number;
  y: number;
  parameters: Parameter[];
  ports: PortConfig[];
}

interface WireData {
  id: string;
  type: 'scalar' | 'field' | 'color' | 'output';
  sourceNode: string;
  sourcePort: string;
  targetNode: string;
  targetPort: string;
}

export default function App() {
  const [selectedNode, setSelectedNode] = useState<string | null>('node-2');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  // Example node data
  const nodes: NodeData[] = [
    {
      id: 'node-1',
      name: 'POSITION GRADIENT',
      description: 'Maps distance from center',
      weight: 'light',
      x: 150,
      y: 100,
      parameters: [
        { label: 'Center X', value: '0.50' },
        { label: 'Center Y', value: '0.50' }
      ],
      ports: [
        { id: 'p1-out', type: 'field', connected: true, position: 'output' }
      ]
    },
    {
      id: 'node-2',
      name: 'SPECTRUM RANGE',
      description: 'Bass frequency range',
      weight: 'heavy',
      x: 150,
      y: 320,
      parameters: [
        { label: 'Low Freq', value: '20 Hz' },
        { label: 'High Freq', value: '250 Hz' },
        { label: 'Smoothing', value: '0.85' }
      ],
      ports: [
        { id: 'p2-out', type: 'scalar', connected: true, position: 'output' }
      ]
    },
    {
      id: 'node-3',
      name: 'MULTIPLY',
      description: 'Scalar multiplication',
      weight: 'light',
      x: 500,
      y: 180,
      parameters: [],
      ports: [
        { id: 'p3-in1', type: 'field', connected: true, position: 'input' },
        { id: 'p3-in2', type: 'scalar', connected: true, position: 'input' },
        { id: 'p3-out', type: 'field', connected: true, position: 'output' }
      ]
    },
    {
      id: 'node-4',
      name: 'PALETTE INTERPOLATE',
      description: 'Maps values to color gradient',
      weight: 'light',
      x: 850,
      y: 200,
      parameters: [
        { label: 'Palette', value: 'Sunset' }
      ],
      ports: [
        { id: 'p4-in', type: 'field', connected: true, position: 'input' },
        { id: 'p4-out', type: 'color', connected: true, position: 'output' }
      ]
    },
    {
      id: 'node-5',
      name: 'BEAT DETECTOR',
      description: 'Detects rhythmic impacts',
      weight: 'heavy',
      x: 500,
      y: 420,
      parameters: [
        { label: 'Sensitivity', value: '0.75' },
        { label: 'Decay', value: '200ms' }
      ],
      ports: [
        { id: 'p5-out', type: 'scalar', connected: false, position: 'output' }
      ]
    },
    {
      id: 'node-6',
      name: 'OUTPUT',
      description: 'Final LED render',
      weight: 'light',
      x: 1200,
      y: 220,
      parameters: [
        { label: 'Brightness', value: '1.0' }
      ],
      ports: [
        { id: 'p6-in', type: 'color', connected: true, position: 'input' }
      ]
    }
  ];
  
  // Example wire connections
  const wires: WireData[] = [
    {
      id: 'wire-1',
      type: 'field',
      sourceNode: 'node-1',
      sourcePort: 'p1-out',
      targetNode: 'node-3',
      targetPort: 'p3-in1'
    },
    {
      id: 'wire-2',
      type: 'scalar',
      sourceNode: 'node-2',
      sourcePort: 'p2-out',
      targetNode: 'node-3',
      targetPort: 'p3-in2'
    },
    {
      id: 'wire-3',
      type: 'field',
      sourceNode: 'node-3',
      sourcePort: 'p3-out',
      targetNode: 'node-4',
      targetPort: 'p4-in'
    },
    {
      id: 'wire-4',
      type: 'color',
      sourceNode: 'node-4',
      sourcePort: 'p4-out',
      targetNode: 'node-6',
      targetPort: 'p6-in'
    }
  ];
  
  // Helper function to get port position
  const getPortPosition = (nodeId: string, portId: string, position: 'input' | 'output') => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    
    const portIndex = node.ports.filter(p => p.position === position).findIndex(p => p.id === portId);
    const baseY = node.y + 60 + portIndex * 40;
    
    return {
      x: position === 'input' ? node.x : node.x + 280,
      y: baseY
    };
  };
  
  return (
    <div className="prism-app">
      {/* Canvas Background */}
      <div className="canvas-background">
        <LEDPreview />
        
        {/* Grid overlay */}
        <div className="canvas-grid" />
      </div>
      
      {/* Node Graph Canvas */}
      <div className="node-canvas">
        {/* SVG for wires */}
        <svg className="wire-canvas" width="100%" height="100%">
          <defs>
            <filter id="wire-glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {wires.map(wire => {
            const start = getPortPosition(wire.sourceNode, wire.sourcePort, 'output');
            const end = getPortPosition(wire.targetNode, wire.targetPort, 'input');
            
            return (
              <Wire
                key={wire.id}
                type={wire.type}
                startX={start.x}
                startY={start.y}
                endX={end.x}
                endY={end.y}
              />
            );
          })}
        </svg>
        
        {/* Nodes */}
        {nodes.map(node => (
          <NodeCard
            key={node.id}
            id={node.id}
            name={node.name}
            description={node.description}
            weight={node.weight}
            state={
              selectedNode === node.id ? 'selected' :
              hoveredNode === node.id ? 'hover' :
              'default'
            }
            parameters={node.parameters}
            ports={node.ports}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
            onClick={() => setSelectedNode(node.id)}
            style={{
              position: 'absolute',
              left: node.x,
              top: node.y
            }}
          />
        ))}
      </div>
      
      {/* Compilation Feedback Panel */}
      <CompilationPanel
        status="all-pass"
        graphHealth={{
          nodes: 6,
          edges: 4,
          outdegreeMin: 0,
          outdegreeMax: 1,
          outdegreeAvg: 0.7,
          isDAG: true
        }}
        performance={{
          predicted: 6.42,
          cpu: 54,
          topoTime: 0.18
        }}
        errors={[]}
        risk={{
          changed: ['SPECTRUM RANGE'],
          impacted: ['MULTIPLY', 'PALETTE INTERPOLATE', 'OUTPUT']
        }}
      />
      
      {/* Logo */}
      <div className="prism-logo">
        <div className="logo-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 4L6 28H26L16 4Z" stroke="white" strokeWidth="2" fill="none"/>
            <path d="M16 4L16 28" stroke="white" strokeWidth="1" opacity="0.5"/>
          </svg>
        </div>
        <div className="logo-text">
          <span className="logo-name">SPECTRASYNQ</span>
          <div className="logo-underline" />
        </div>
      </div>
      
      {/* Design System Info */}
      <DesignSystemInfo />
    </div>
  );
}
