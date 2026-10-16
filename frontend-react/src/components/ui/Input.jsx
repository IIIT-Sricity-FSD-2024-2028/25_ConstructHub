import React, { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    id,
    type = 'text',
    className = '',
    required = false,
    ...props
  },
  ref
) {
  const inputId = id || props.name || undefined;

  return (
    <div className="form-group" style={{ marginBottom: '16px' }}>
      {label && (
        <label
          htmlFor={inputId}
          className="form-label"
          style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}
        >
          {label} {required && <span style={{ color: 'var(--red, #ef4444)' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {Icon && (
          <span
            style={{
              position: 'absolute',
              left: '12px',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              color: 'var(--text-muted, #94a3b8)',
            }}
          >
            <Icon size={18} />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          className={`form-control ${error ? 'is-invalid' : ''} ${className}`.trim()}
          style={Icon ? { paddingLeft: '40px', width: '100%' } : { width: '100%' }}
          {...props}
        />
      </div>

      {error && (
        <p className="form-error" style={{ color: 'var(--red, #ef4444)', fontSize: '0.75rem', marginTop: '4px' }}>
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="form-helper" style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.75rem', marginTop: '4px' }}>
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Input;
