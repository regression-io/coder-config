import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FILE_CONFIG } from '../fileConfig';

export default function CreateFileDialog({ open, onClose, dir, type, onCreate }) {
  const [name, setName] = useState('');

  useEffect(() => {
    setName('');
  }, [open]);

  const handleCreate = () => {
    if ((type === 'command' || type === 'rule' || type === 'workflow' || type === 'memory' || type === 'skill') && !name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    let finalName;
    if (type === 'skill') {
      // Skills use directory name, no .md extension
      finalName = name.trim().replace(/\.md$/, '').replace(/[^a-zA-Z0-9_-]/g, '-');
    } else if (type === 'command' || type === 'rule' || type === 'workflow' || type === 'memory') {
      finalName = name.endsWith('.md') ? name : `${name}.md`;
    } else {
      finalName = name;
    }
    onCreate(dir, finalName, type);
  };

  const config = FILE_CONFIG[type] || {};
  const needsName = type === 'command' || type === 'rule' || type === 'workflow' || type === 'memory' || type === 'skill';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create {config.label || type}</DialogTitle>
        </DialogHeader>
        {needsName && (
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              className="mt-1"
              placeholder={type === 'skill' ? 'my-skill' : type === 'command' ? 'my-command.md' : type === 'workflow' ? 'my-workflow.md' : type === 'memory' ? 'context.md' : 'my-rule.md'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
