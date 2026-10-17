import React from 'react';

export default function Button({
  children,
  variant = 'primary', // primary, secondary, danger, success, outline
  size = 'md', // sm, md, lg
  full = false,
  disabled = false,
  isLoading = false,
  type = 'button',
  onClick,
  className = '',
  icon: Icon,
  ...props
}) {
  const variantClass = `btn-${variant}`;
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const fullClass = full ? 'btn-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`btn ${variantClass} ${sizeClass} ${fullClass} ${className}`.trim()}
      {...props}
    >
      {isLoading ? (
        <span className="btn-spinner" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : 16} />
      )}
      {children}
    </button>
  );
}
