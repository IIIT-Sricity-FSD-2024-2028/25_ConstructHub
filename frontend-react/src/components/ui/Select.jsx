import React, { forwardRef } from 'react';

const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    id,
    options = [],
    children,
    className = '',
    required = false,
    ...props
  },
  ref
) {
  const selectId = id || props.name || undefined;

  return (
    <div className="form-group" style={{ marginBottom: '16px' }}>
      {label && (
        <label
          htmlFor={selectId}
          className="form-label"
          style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}
        >
          {label} {required && <span style={{ color: 'var(--red, #ef4444)' }}>*</span>}
        </label>
      )}

      <select
        ref={ref}
        id={selectId}
        required={required}
        className={`form-control ${error ? 'is-invalid' : ''} ${className}`.trim()}
        style={{ width: '100%' }}
        {...props}
      >
        {children ||
          options.map((opt) => {
            const value = typeof opt === 'object' ? opt.value : opt;
            const text = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={value} value={value}>
                {text}
              </option>
            );
          })}
      </select>

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

export default Select;
