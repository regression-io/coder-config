import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import Terminal from './Terminal';

/**
 * Dialog wrapper for the Terminal component
 * Used to run commands like `claude /init` in a popup
 */
export default function TerminalDialog({
  open,
  onOpenChange,
  title = 'Terminal',
  description,
  cwd,
  initialCommand,
  onExit
}) {
  const handleExit = (exitCode, signal) => {
    if (onExit) {
      onExit(exitCode, signal);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-1">
                  {description}
                </DialogDescription>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 p-2 min-h-0">
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
      </DialogContent>
    </Dialog>
  );
}
