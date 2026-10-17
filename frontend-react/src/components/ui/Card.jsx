import React from 'react';

export default function Card({
  title,
  subtitle,
  action,
  children,
  footer,
  className = '',
  style = {},
  ...props
}) {
  return (
    <div className={`card ${className}`.trim()} style={style} {...props}>
      {(title || subtitle || action) && (
        <div
          className="card-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div>
            {title && <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{title}</h3>}
            {subtitle && (
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #94a3b8)', fontSize: '0.875rem' }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}

      <div className="card-body">{children}</div>

      {footer && (
        <div
          className="card-footer"
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border, #e2e8f0)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
