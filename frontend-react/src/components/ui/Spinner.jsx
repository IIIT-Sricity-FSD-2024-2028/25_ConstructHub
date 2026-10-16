import React from 'react';

export default function Spinner({ size = 28, color = 'var(--primary, #f97316)', className = '' }) {
  return (
    <div
      className={`spinner-container ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="status"
      aria-label="Loading"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: 'spin 0.8s linear infinite',
        }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ opacity: 0.2, color }}
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ color }}
        />
      </svg>
    </div>
  );
}
