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

export default function RenameDialog({ open, onClose, item, onRename }) {
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (item?.name) {
      // Skills use directory name (no .md to strip)
      setNewName(item.type === 'skill' ? item.name : item.name.replace(/\.md$/, ''));
    }
  }, [item, open]);

  const handleRename = () => {
    if (!newName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    onRename(item, newName.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename {item?.type}</DialogTitle>
        </DialogHeader>
        <div>
          <label className="text-sm font-medium">New name</label>
          <Input
            className="mt-1"
            placeholder="new-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {item?.type === 'skill' ? 'Enter the skill name' : '.md extension will be added automatically'}
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleRename}>Rename</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
