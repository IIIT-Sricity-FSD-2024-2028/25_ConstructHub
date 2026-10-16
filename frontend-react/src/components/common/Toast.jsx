import React from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;

  return (
    <div
      className={`ch-toast toast-${type}`}
      style={{ display: 'block', cursor: 'pointer' }}
      onClick={onClose}
    >
      {message}
    </div>
  );
}
