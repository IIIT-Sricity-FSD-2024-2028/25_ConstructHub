import Toast from './Toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectToasts, toastRemoved } from '../../features/ui/uiSlice';

/** Renders the toast messages held in the store (bottom-right corner). Click one to close it. */
export default function ToastHost() {
  const toasts = useAppSelector(selectToasts);
  const dispatch = useAppDispatch();
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map((toast) => (
        <div key={toast.id} onClick={() => dispatch(toastRemoved(toast.id))} style={{ cursor: 'pointer' }}>
          <Toast type={toast.type} message={toast.message} />
        </div>
      ))}
    </div>
  );
}
