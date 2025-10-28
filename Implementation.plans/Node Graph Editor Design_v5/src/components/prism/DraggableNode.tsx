import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';

interface Position {
  x: number;
  y: number;
}

interface DraggableNodeProps {
  children: React.ReactNode;
  initialPosition: Position;
  gridSize?: number;
  onPositionChange?: (position: Position) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  id: string;
}

export const DraggableNode: React.FC<DraggableNodeProps> = ({
  children,
  initialPosition,
  gridSize = 40,
  onPositionChange,
  onDragStart,
  onDragEnd,
  id,
}) => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<Position>({ x: 0, y: 0 });
  const elementStartPos = useRef<Position>(initialPosition);

  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  const snapToGrid = (value: number): number => {
    return Math.round(value / gridSize) * gridSize;
  };

  const handleDragStart = (event: React.MouseEvent) => {
    // Only start drag if clicking on the node itself, not on interactive elements
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select')
    ) {
      return;
    }

    setIsDragging(true);
    dragStartPos.current = { x: event.clientX, y: event.clientY };
    elementStartPos.current = position;
    onDragStart?.();

    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - dragStartPos.current.x;
      const deltaY = event.clientY - dragStartPos.current.y;

      const newX = elementStartPos.current.x + deltaX;
      const newY = elementStartPos.current.y + deltaY;

      // Real-time position update (no snapping during drag for smooth movement)
      const newPosition = { x: newX, y: newY };
      setPosition(newPosition);
      onPositionChange?.(newPosition);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        // Apply grid snapping on release
        const snappedPosition = {
          x: snapToGrid(position.x),
          y: snapToGrid(position.y),
        };
        setPosition(snappedPosition);
        onPositionChange?.(snappedPosition);
        setIsDragging(false);
        onDragEnd?.();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position, gridSize, onPositionChange, onDragEnd]);

  return (
    <motion.div
      data-node-id={id}
      onMouseDown={handleDragStart}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      animate={{
        scale: isDragging ? 1.02 : 1,
      }}
      transition={{
        scale: { duration: 0.1 },
      }}
    >
      {children}
    </motion.div>
  );
};
