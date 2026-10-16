import React from 'react';

export default function Button({
  children,
  variant = 'primary', // primary, secondary, danger, success, outline
  size = 'md', // sm, md, lg
  full = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  icon: Icon,
  ...props
}) {
  const variantClass = `btn-${variant}`;
  const sizeClass = size === 'sm' ? 'btn-sm' : '';
  const fullClass = full ? 'btn-full' : '';

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn ${variantClass} ${sizeClass} ${fullClass} ${className}`.trim()}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}
