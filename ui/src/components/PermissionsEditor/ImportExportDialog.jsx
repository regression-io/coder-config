import React, { useState, useEffect } from 'react';
import { Download, Upload, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ImportExportDialog({
  open,
  onOpenChange,
  mode,
  permissions,
  onImport
}) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && mode === 'export') {
      setJsonText(JSON.stringify({ permissions }, null, 2));
      setError(null);
    } else if (open && mode === 'import') {
      setJsonText('');
      setError(null);
    }
  }, [open, mode, permissions]);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);

      // Validate structure
      if (!parsed.permissions) {
        setError('JSON must have a "permissions" key');
        return;
      }

      const { allow = [], ask = [], deny = [] } = parsed.permissions;

      // Validate arrays
      if (!Array.isArray(allow) || !Array.isArray(ask) || !Array.isArray(deny)) {
        setError('allow, ask, and deny must be arrays');
        return;
      }

      // Validate entries are strings
      const allRules = [...allow, ...ask, ...deny];
      if (allRules.some(r => typeof r !== 'string')) {
        setError('All permission rules must be strings');
        return;
      }

      onImport(parsed.permissions);
      onOpenChange(false);
    } catch (e) {
      setError('Invalid JSON: ' + e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'export' ? (
              <>
                <Download className="w-5 h-5 text-indigo-600" />
                Export Permissions
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-indigo-600" />
                Import Permissions
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'export'
              ? 'Copy this JSON to save or share your permission configuration.'
              : 'Paste a JSON permission configuration to import.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null);
            }}
            placeholder={mode === 'import' ? 'Paste JSON here...' : ''}
            className="font-mono text-sm min-h-[300px]"
            readOnly={mode === 'export'}
          />

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          {mode === 'export' ? (
            <Button onClick={handleCopy} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={!jsonText.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
