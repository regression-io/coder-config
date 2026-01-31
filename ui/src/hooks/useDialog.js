import { useState, useCallback } from 'react';

/**
 * Hook for managing dialog open/close state with optional data.
 *
 * @example
 * const editDialog = useDialog();
 *
 * // Open with data
 * editDialog.open({ id: 1, name: 'foo' });
 *
 * // In Dialog component
 * <Dialog open={editDialog.isOpen} onOpenChange={editDialog.onOpenChange}>
 *   <p>Editing: {editDialog.data?.name}</p>
 * </Dialog>
 */
export function useDialog(initialData = null) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(initialData);

  const open = useCallback((dialogData = null) => {
    setData(dialogData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Keep data until animation completes, then clear
    setTimeout(() => setData(null), 150);
  }, []);

  const onOpenChange = useCallback((open) => {
    if (!open) close();
    else setIsOpen(true);
  }, [close]);

  return {
    isOpen,
    data,
    open,
    close,
    onOpenChange,
    setData, // For updating data while open
  };
}

export default useDialog;
