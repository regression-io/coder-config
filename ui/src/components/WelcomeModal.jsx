import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sparkles, Settings, Shield, Package, GraduationCap, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'claude-config-welcome-seen';

export default function WelcomeModal({ onStartTutorial }) {
  const [open, setOpen] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(true);

  useEffect(() => {
    // Check if user has seen the welcome modal
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // Small delay to let the page load first
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSkip = () => {
    if (dontAskAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setOpen(false);
  };

  const handleStartTutorial = () => {
    if (dontAskAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setOpen(false);
    onStartTutorial?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-2xl">Welcome to Coder Config</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Your control center for Claude Code and AI coding tools.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            We built Coder Config because managing AI coding assistants shouldn't require editing JSON files
            or memorizing command-line flags. You deserve a visual interface that makes configuration easy.
          </p>

          <div className="grid grid-cols-3 gap-3 py-2">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Package className="w-5 h-5 mx-auto mb-2 text-indigo-500" />
              <span className="text-xs text-muted-foreground">MCP Servers</span>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Shield className="w-5 h-5 mx-auto mb-2 text-green-500" />
              <span className="text-xs text-muted-foreground">Permissions</span>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Sparkles className="w-5 h-5 mx-auto mb-2 text-amber-500" />
              <span className="text-xs text-muted-foreground">Rules & Memory</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Take our guided tutorial to learn the basics, or dive in and explore on your own.
          </p>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="dont-ask"
              checked={dontAskAgain}
              onCheckedChange={setDontAskAgain}
            />
            <Label htmlFor="dont-ask" className="text-sm text-muted-foreground cursor-pointer">
              Don't show this again
            </Label>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button onClick={handleStartTutorial} className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Start Tutorial
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
