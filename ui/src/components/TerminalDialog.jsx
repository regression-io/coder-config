import React, { useRef, useCallback, useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import Terminal from './Terminal';
import { cn } from '@/lib/utils';

/**
 * Dialog wrapper for the Terminal component
 * Uses custom dialog implementation to prevent keyboard events from closing
 */
export default function TerminalDialog({
  open,
  onOpenChange,
  title = 'Terminal',
  description,
  cwd,
  initialCommand,
  onExit,
  autoCloseOnExit = false,
  autoCloseDelay = 1500
}) {
  const terminalContainerRef = useRef(null);
  const [exited, setExited] = useState(false);

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
    // Auto-close after delay if enabled
    if (autoCloseOnExit) {
      setTimeout(() => {
        onOpenChange(false);
      }, autoCloseDelay);
    }
  }, [onExit, autoCloseOnExit, autoCloseDelay, onOpenChange]);

  // Focus the terminal container when dialog opens
  const handleOpenAutoFocus = useCallback((e) => {
    e.preventDefault();
    // Focus will be handled by the terminal component
  }, []);

  // Prevent Escape from closing while terminal is active
  const handleEscapeKeyDown = useCallback((e) => {
    // Let Escape close the dialog (default behavior)
    // But prevent other keys from propagating
  }, []);

  // Prevent keyboard events from bubbling to dialog
  const handleKeyDown = useCallback((e) => {
    // Stop all keyboard events from reaching the dialog
    // except Escape which should close it
    if (e.key !== 'Escape') {
      e.stopPropagation();
    }
  }, []);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "max-w-4xl w-full h-[600px] flex flex-col p-0 gap-0",
            "border bg-background shadow-lg sm:rounded-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
          onOpenAutoFocus={handleOpenAutoFocus}
          onEscapeKeyDown={handleEscapeKeyDown}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
                  {title}
                </DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description className="text-sm text-muted-foreground mt-1">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onOpenChange(false)}
                tabIndex={-1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Terminal container */}
          <div ref={terminalContainerRef} className="flex-1 p-2 min-h-0">
            {open && (
              <Terminal
                cwd={cwd}
                initialCommand={initialCommand}
                onExit={handleExit}
                height="100%"
                className="h-full"
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
