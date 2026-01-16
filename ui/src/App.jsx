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
          // Also show a toast in case banner is not visible
          toast('Update available!', {
            id: 'update-available',
            duration: Infinity,
            description: 'New version ready to apply.',
            action: {
              label: 'Restart Now',
              onClick: async () => {
                try {
                  await api.restartServer();
                  toast.info('Restarting...');
                  setTimeout(() => window.location.reload(), 2000);
                } catch (e) {
                  toast.error('Restart failed');
                }
              },
            },
          });
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
        {/* Update Banner */}
        {updateAvailable && !isRestarting && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-2 flex items-center justify-center gap-4 shadow-lg">
            <span className="text-sm font-medium">
              Update available! Restart the server to apply changes.
            </span>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 bg-white text-blue-600 hover:bg-blue-50"
              onClick={handleRestart}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Restart Now
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-blue-500 rounded"
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
