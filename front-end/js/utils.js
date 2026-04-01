// ConstructHub - Utility Functions

// ─── Formatting ───────────────────────────────────────────────────────────────
function formatCurrency(n) {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + 'Cr';
  if (n >= 100000)   return '₹' + (n / 100000).toFixed(2) + 'L';
  return '₹' + n.toLocaleString('en-IN');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
  return Math.floor(diff / 86400) + ' days ago';
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    'On Track':    'badge-green',
    'At Risk':     'badge-orange',
    'Delayed':     'badge-red',
    'Completed':   'badge-green',
    'In Progress': 'badge-blue',
    'Pending':     'badge-gray',
    'Scheduled':   'badge-gray',
    'Under Review':'badge-orange',
    'Approved':    'badge-green',
    'Rejected':    'badge-red',
    'active':      'badge-green',
    'inactive':    'badge-gray'
  };
  const cls = map[status] || 'badge-gray';
  return `<span class="badge ${cls}">${status}</span>`;
}

function priorityBadge(p) {
  const map = { 'High': 'badge-red', 'Medium': 'badge-orange', 'Low': 'badge-green' };
  return `<span class="badge ${map[p] || 'badge-gray'}">${p}</span>`;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function progressBar(pct, color) {
  color = color || '#f97316';
  return `<div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type) {
  type = type || 'success';
  let toast = document.getElementById('ch-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ch-toast';
    document.body.appendChild(toast);
  }
  toast.className = 'ch-toast toast-' + type;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'flex';
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'none';
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
}

// ─── Form Validation ──────────────────────────────────────────────────────────
function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return false;
  let valid = true;
  form.querySelectorAll('[data-required]').forEach(el => {
    clearError(el);
    if (!el.value.trim()) {
      showError(el, el.dataset.errMsg || 'This field is required');
      valid = false;
    }
  });
  form.querySelectorAll('[data-email]').forEach(el => {
    if (el.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value)) {
      showError(el, 'Enter a valid email address');
      valid = false;
    }
  });
  form.querySelectorAll('[data-min]').forEach(el => {
    if (el.value && Number(el.value) < Number(el.dataset.min)) {
      showError(el, `Minimum value is ${el.dataset.min}`);
      valid = false;
    }
  });
  form.querySelectorAll('[data-maxlen]').forEach(el => {
    if (el.value && el.value.length > Number(el.dataset.maxlen)) {
      showError(el, `Maximum ${el.dataset.maxlen} characters`);
      valid = false;
    }
  });
  return valid;
}

function showError(el, msg) {
  el.classList.add('input-error');
  const e = document.createElement('span');
  e.className = 'field-error';
  e.textContent = msg;
  el.parentNode.insertBefore(e, el.nextSibling);
}

function clearError(el) {
  el.classList.remove('input-error');
  const next = el.nextSibling;
  if (next && next.className === 'field-error') next.remove();
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function confirmAction(msg, onConfirm) {
  if (confirm(msg)) onConfirm();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function avatarEl(initials, size) {
  size = size || 36;
  const colors = ['#f97316','#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444'];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:${color};font-size:${size*0.38}px">${initials}</div>`;
}

// ─── Sidebar Active State ─────────────────────────────────────────────────────
function setSidebarActive(linkText) {
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.remove('active');
    if (a.textContent.trim().includes(linkText)) a.classList.add('active');
  });
}

// ─── Render Navbar ─────────────────────────────────────────────────────────────
function renderNavbar(user) {
  const navbar = document.getElementById('navbar');
  if (!navbar || !user) return;
  const count = getUnreadCount(user.id);
  navbar.innerHTML = `
    <div class="nav-left">
      <div class="nav-logo">
        <div class="logo-icon"><img src="../../icons/HardHat.svg" width="28" height="28" alt="logo" style="vertical-align:middle; filter: invert(45%) sepia(85%) saturate(2000%) hue-rotate(345deg);"></div>
        <span class="logo-text">ConstructHub</span>
      </div>
    </div>
    <div class="nav-center">
    </div>
    <div class="nav-right">
      <div class="notif-btn" onclick="toggleNotifications()">
        <img src="../../icons/Bell.svg" alt="🔔" style="vertical-align: -2px; width: 15px; margin: 0 4px;" class="icon-inline">
        ${count > 0 ? `<span class="notif-badge">${count}</span>` : ''}
      </div>
      <div class="user-menu" onclick="toggleUserMenu()">
        ${avatarEl(user.avatar || user.name.substring(0,2).toUpperCase(), 36)}
        <div class="user-info">
          <span class="user-name">${user.name}</span>
          <span class="user-role">${roleLabel(user.role)}</span>
        </div>
        <div id="user-dropdown" class="user-dropdown" style="display:none">
          <div class="dropdown-header">My Account</div>
          <a href="settings.html">Settings</a>
          <a href="#" onclick="logout()" class="logout-link">→ Logout</a>
        </div>
      </div>
    </div>
    <div id="notif-panel" class="notif-panel" style="display:none"></div>
  `;
}

function toggleUserMenu() {
  const d = document.getElementById('user-dropdown');
  if (d) d.style.display = d.style.display === 'none' ? 'block' : 'none';
}

function toggleNotifications() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  if (panel.style.display === 'none') {
    const user = getCurrentUser();
    const notifs = getUserNotifications(user.id);
    panel.innerHTML = `
      <div class="notif-header">
        <strong>Notifications</strong>
        ${notifs.filter(n=>!n.read).length > 0 ? `<span class="badge badge-red">${notifs.filter(n=>!n.read).length} New</span>` : ''}
      </div>
      ${notifs.length ? notifs.map(n => `
        <div class="notif-item ${n.read ? '' : 'notif-unread'}" onclick="showNotifModal('${n.id}')" style="cursor:pointer">
          <strong>${n.title}</strong>
          <p>${n.body}</p>
          <small>${n.time}</small>
        </div>
      `).join('') : '<p class="notif-empty">No notifications</p>'}
    `;
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

window.showNotifModal = function(id) {
  const notifs = typeof getAll === 'function' ? getAll('notifications') : [];
  const n = notifs.find(x => x.id === id);
  if (!n) return;
  if (!n.read && typeof update === 'function') { update('notifications', id, {read: true}); renderNavbar(getCurrentUser()); }
  let m = document.getElementById('global-notif-modal');
  if(!m) {
    m = document.createElement('div');
    m.id = 'global-notif-modal';
    m.className = 'modal-overlay';
    m.innerHTML = '<div class="modal-box"><div class="modal-header"><div><h2 id="gnm-title"></h2></div><button class="modal-close" onclick="closeModal(\'global-notif-modal\')"><img src="../../icons/X.svg" alt="X" class="icon-inline" style="width:15px"></button></div><div id="gnm-body" style="padding:10px 0;font-size:14px;color:var(--text);line-height:1.5"></div><div style="font-size:11px;color:var(--text-muted);margin-top:10px" id="gnm-time"></div><div class="modal-footer"><button onclick="closeModal(\'global-notif-modal\')" class="btn btn-primary">Close</button></div></div>';
    document.body.appendChild(m);
  }
  document.getElementById('gnm-title').textContent = n.title;
  if (n.title === 'New Contact Inquiry' && n.details) {
    const details = n.details || {};
    document.getElementById('gnm-body').innerHTML = `
      <div style="display:grid;gap:14px">
        <div style="background:var(--bg);padding:14px;border-radius:var(--radius)">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">Contact Details</div>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;font-size:13px">
            <div><div style="color:var(--text-muted);font-size:11px;text-transform:uppercase;font-weight:600;margin-bottom:3px">Full Name</div><strong>${details.name || 'N/A'}</strong></div>
            <div><div style="color:var(--text-muted);font-size:11px;text-transform:uppercase;font-weight:600;margin-bottom:3px">Email Address</div><strong>${details.email || 'N/A'}</strong></div>
            <div><div style="color:var(--text-muted);font-size:11px;text-transform:uppercase;font-weight:600;margin-bottom:3px">Phone Number</div><strong>${details.phone || 'N/A'}</strong></div>
            <div><div style="color:var(--text-muted);font-size:11px;text-transform:uppercase;font-weight:600;margin-bottom:3px">Company Name</div><strong>${details.company || 'N/A'}</strong></div>
          </div>
        </div>
        <div style="background:var(--bg);padding:14px;border-radius:var(--radius)">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">Message</div>
          <div style="font-size:13px;line-height:1.7;color:var(--text)">${details.message || 'No message provided.'}</div>
        </div>
      </div>
    `;
  } else {
    document.getElementById('gnm-body').textContent = n.body;
  }
  document.getElementById('gnm-time').textContent = 'Sent: ' + n.time;
  openModal('global-notif-modal');
};

function roleLabel(role) {
  const map = {
    'superuser': 'Super User',
    'project_manager': 'Project Manager',
    'site_engineer': 'Site Engineer',
    'finance_manager': 'Finance Manager',
    'client': 'Client'
  };
  return map[role] || role;
}

// Close dropdowns on outside click
document.addEventListener('click', function(e) {
  if (!e.target.closest('.user-menu')) {
    const d = document.getElementById('user-dropdown');
    if (d) d.style.display = 'none';
  }
  if (!e.target.closest('.notif-btn') && !e.target.closest('.notif-panel')) {
    const p = document.getElementById('notif-panel');
    if (p) p.style.display = 'none';
  }
});
