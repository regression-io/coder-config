import { useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Hook for handling async actions with loading state and toast notifications.
 *
 * @example
 * const { execute, loading } = useAsyncAction({
 *   onSuccess: () => toast.success('Saved!'),
 *   onError: (err) => toast.error(err),
 * });
 *
 * const handleSave = () => execute(async () => {
 *   return await api.save(data);
 * });
 */
export function useAsyncAction(options = {}) {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (action) => {
    setLoading(true);
    try {
      const result = await action();

      // Handle {success, error} pattern from stores/API
      if (result && typeof result === 'object') {
        if (result.success === false) {
          const errorMsg = result.error || 'Operation failed';
          options.onError?.(errorMsg);
          return result;
        }
        if (result.success === true || result.success === undefined) {
          options.onSuccess?.(result);
          return result;
        }
      }

      options.onSuccess?.(result);
      return result;
    } catch (error) {
      const errorMsg = error.message || 'Operation failed';
      options.onError?.(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [options.onSuccess, options.onError]);

  return { execute, loading };
}

/**
 * Simplified version that auto-shows toasts.
 */
export function useAsyncActionWithToast(successMessage, errorPrefix = 'Failed') {
  return useAsyncAction({
    onSuccess: () => successMessage && toast.success(successMessage),
    onError: (err) => toast.error(`${errorPrefix}: ${err}`),
  });
}

export default useAsyncAction;
