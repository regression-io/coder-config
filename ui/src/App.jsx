import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from "sonner";
import Dashboard from './pages/Dashboard';
import { ThemeProvider } from '@/components/ThemeProvider';
import { api } from './lib/api';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

function App() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleRestart = useCallback(async () => {
    setIsRestarting(true);
    try {
      await api.restartServer();
      toast.info('Server restarting... page will reload.');
      // Wait for server to restart, then reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (e) {
      toast.error('Failed to restart: ' + e.message);
      setIsRestarting(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setUpdateAvailable(false);
    toast.dismiss('update-available');
  }, []);

  // Check for version changes periodically
  useEffect(() => {
    let interval;

    const checkVersion = async () => {
      try {
        const data = await api.getVersion();
        console.log('[Update Check]', data);
        if (data.needsRestart && !dismissed) {
          setUpdateAvailable(true);
        }
      } catch (e) {
        // Server might be restarting
      }
    };

    // Check immediately, then every 30 seconds
    checkVersion();
    interval = setInterval(checkVersion, 30000);

    return () => clearInterval(interval);
  }, [dismissed]);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        {/* Update Banner - click to restart, X to dismiss */}
        {updateAvailable && !isRestarting && (
          <div
            className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg cursor-pointer hover:bg-blue-700 transition-colors"
            onClick={handleRestart}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">
              Update available — click to restart
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
              className="absolute right-3 p-1 hover:bg-blue-500 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {isRestarting && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white px-4 py-2 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Restarting server...</span>
          </div>
        )}
        <Dashboard />
        <Toaster position="bottom-right" richColors />
      </div>
    </ThemeProvider>
  );
}

export default App;
