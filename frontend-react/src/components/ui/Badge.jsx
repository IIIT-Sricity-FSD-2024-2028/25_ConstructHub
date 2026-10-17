import React from 'react';
import { statusBadgeClass, priorityBadgeClass, roleBadgeClass } from '../../services/utils';

export default function Badge({
  variant, // 'green' | 'orange' | 'red' | 'blue' | 'gray'
  status,  // automatically resolved via statusBadgeClass
  priority,// automatically resolved via priorityBadgeClass
  role,    // automatically resolved via roleBadgeClass
  children,
  className = '',
  ...props
}) {
  let badgeClass = 'badge-gray';

  if (variant) {
    badgeClass = `badge-${variant}`;
  } else if (status) {
    badgeClass = statusBadgeClass(status);
  } else if (priority) {
    badgeClass = priorityBadgeClass(priority);
  } else if (role) {
    badgeClass = roleBadgeClass(role);
  }

  return (
    <span className={`badge ${badgeClass} ${className}`.trim()} {...props}>
      {children || status || priority || role}
    </span>
  );
}
