import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Minimize2, Maximize2, GripVertical } from 'lucide-react';
import Terminal from './Terminal';
import { cn } from '@/lib/utils';

/**
 * Non-modal, resizable terminal panel
 * Can be dragged, resized, and doesn't block interaction with the rest of the UI
 */
export default function TerminalDialog({
  open,
  onOpenChange,
  title = 'Terminal',
  description,
  cwd,
  initialCommand,
  env = {},
  onExit,
  autoCloseOnExit = false,
  autoCloseDelay = 1500,
  headerExtra = null
}) {
  const terminalContainerRef = useRef(null);
  const panelRef = useRef(null);
  const [exited, setExited] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState({ x: null, y: null });
  const [size, setSize] = useState({ width: 1100, height: 650 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Initialize position on first open
  useEffect(() => {
    if (open && position.x === null) {
      // Position in center of screen
      setPosition({
        x: Math.max(20, (window.innerWidth - size.width) / 2),
        y: Math.max(20, (window.innerHeight - size.height) / 2)
      });
    }
  }, [open, position.x, size.width, size.height]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setExited(false);
    }
  }, [open]);

  const handleExit = useCallback((exitCode, signal) => {
    setExited(true);
    if (onExit) {
      onExit(exitCode, signal);
    }
    if (autoCloseOnExit) {
      setTimeout(() => {
        onOpenChange(false);
      }, autoCloseDelay);
    }
  }, [onExit, autoCloseOnExit, autoCloseDelay, onOpenChange]);

  // Drag handling
  const handleDragStart = useCallback((e) => {
    if (isMaximized) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, [isMaximized]);

  const handleDrag = useCallback((e) => {
    if (!isDragging) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y));
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Resize handling
  const handleResizeStart = useCallback((e) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    };
  }, [isMaximized, size]);

  const handleResize = useCallback((e) => {
    if (!isResizing) return;
    const deltaX = e.clientX - resizeStart.current.x;
    const deltaY = e.clientY - resizeStart.current.y;
    setSize({
      width: Math.max(400, resizeStart.current.width + deltaX),
      height: Math.max(300, resizeStart.current.height + deltaY)
    });
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Global mouse events for drag/resize
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag, handleDragEnd]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResize, handleResizeEnd]);

  const handleToggleMaximize = useCallback(() => {
    setIsMaximized(prev => !prev);
  }, []);

  // Prevent keyboard events from bubbling
  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Escape') {
      e.stopPropagation();
    }
  }, []);

  if (!open) return null;

  const panelStyle = isMaximized
    ? { left: 0, top: 0, width: '100vw', height: '100vh' }
    : { left: position.x, top: position.y, width: size.width, height: size.height };

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed z-50 flex flex-col",
        "border bg-background shadow-2xl rounded-lg overflow-hidden",
        isDragging && "cursor-grabbing select-none",
        isResizing && "select-none"
      )}
      style={panelStyle}
      onKeyDown={handleKeyDown}
    >
      {/* Header - draggable */}
      <div
        className={cn(
          "px-4 py-2 border-b flex-shrink-0 bg-muted/50",
          !isMaximized && "cursor-grab"
        )}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-none tracking-tight truncate">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {headerExtra}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleToggleMaximize}
              tabIndex={-1}
            >
              {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onOpenChange(false)}
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Terminal container */}
      <div ref={terminalContainerRef} className="flex-1 p-2 min-h-0 bg-black">
        <Terminal
          cwd={cwd}
          initialCommand={initialCommand}
          env={env}
          onExit={handleExit}
          height="100%"
          className="h-full"
        />
      </div>

      {/* Resize handle - bottom right corner */}
      {!isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <svg
            className="w-full h-full text-muted-foreground/50"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M14 14H10V10H14V14ZM14 6H12V8H14V6ZM6 14H8V12H6V14Z" />
          </svg>
        </div>
      )}
    </div>
  );
}
