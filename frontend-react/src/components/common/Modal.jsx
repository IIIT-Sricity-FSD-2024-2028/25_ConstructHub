import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md', // sm, md, lg
  children,
  footer
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = size === 'lg' ? 'modal-lg' : size === 'sm' ? 'modal-sm' : '';

  return (
    <div className="modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
      <div
        className={`modal-box ${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {onClose && (
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
