import React, { createContext, useState, useCallback } from 'react';
import Toast from '../components/common/Toast';

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const success = useCallback((msg, duration) => showToast(msg, 'success', duration), [showToast]);
  const error = useCallback((msg, duration) => showToast(msg, 'error', duration), [showToast]);
  const info = useCallback((msg, duration) => showToast(msg, 'info', duration), [showToast]);

  const value = {
    showToast,
    success,
    error,
    info,
    removeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              onClick={() => removeToast(toast.id)}
              style={{ cursor: 'pointer' }}
            >
              <Toast type={toast.type} message={toast.message} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
