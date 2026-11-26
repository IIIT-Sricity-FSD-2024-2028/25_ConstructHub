import { useMemo } from 'react';
import { useAppDispatch } from '../store/hooks';
import { showToast, toastRemoved } from '../features/ui/uiSlice';

/** Show toast messages through the store: `const toast = useToast(); toast.success('Saved.')`. */
export function useToast() {
  const dispatch = useAppDispatch();
  return useMemo(() => {
    const show = (message, type = 'info', duration) => dispatch(showToast(message, type, duration));
    return {
      showToast: show,
      success: (message, duration) => show(message, 'success', duration),
      error: (message, duration) => show(message, 'error', duration),
      info: (message, duration) => show(message, 'info', duration),
      removeToast: (id) => dispatch(toastRemoved(id)),
    };
  }, [dispatch]);
}
