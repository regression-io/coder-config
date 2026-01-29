import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, Home, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api";

export default function PathPicker({
  open,
  onOpenChange,
  onSelect,
  type = 'directory', // 'directory' or 'file'
  initialPath = '~',
  title = 'Select Path'
}) {
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [homePath, setHomePath] = useState('');
  const [inputPath, setInputPath] = useState('');

  useEffect(() => {
    if (open) {
      browse(initialPath);
    }
  }, [open, initialPath]);

  const browse = async (path) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.browse(path, type);
      if (result.error) {
        setError(result.error);
        // Still update path if provided
        if (result.path) {
          setCurrentPath(result.path);
          setInputPath(result.path);
        }
      } else {
        setCurrentPath(result.path);
        setInputPath(result.path);
        setItems(result.items || []);
        if (result.home) setHomePath(result.home);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item) => {
    if (item.type === 'directory') {
      browse(item.path);
    } else if (type === 'file') {
      // Select file directly
      onSelect(item.path);
      onOpenChange(false);
    }
  };

  const handleSelect = () => {
    onSelect(currentPath);
    onOpenChange(false);
  };

  const handleGoToPath = () => {
    if (inputPath) {
      browse(inputPath);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleGoToPath();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'directory' ? <Folder className="w-5 h-5" /> : <File className="w-5 h-5" />}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Path input with Go button */}
          <div className="flex gap-2">
            <Input
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter path..."
              className="font-mono text-sm flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => browse(homePath || '~')}
              title="Go to home"
            >
              <Home className="w-4 h-4" />
            </Button>
            <Button onClick={handleGoToPath} disabled={loading}>
              Go
            </Button>
          </div>

          {/* Current path breadcrumb */}
          <div className="text-xs text-gray-500 font-mono truncate px-1">
            {currentPath}
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {/* Directory listing */}
          <ScrollArea className="h-64 border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="p-1">
                {items.length === 0 ? (
                  <div className="text-sm text-gray-500 p-4 text-center">
                    {type === 'directory' ? 'No subdirectories' : 'No files found'}
                  </div>
                ) : (
                  items.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors text-left"
                    >
                      {item.type === 'directory' ? (
                        <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className={`flex-1 truncate ${item.isParent ? 'text-gray-500' : ''}`}>
                        {item.name}
                      </span>
                      {item.type === 'directory' && !item.isParent && (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!currentPath}>
            {type === 'directory' ? 'Select Folder' : 'Select'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
