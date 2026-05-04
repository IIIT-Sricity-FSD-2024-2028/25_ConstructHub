// ConstructHub - Backend API Data Store
// All CRUD data is loaded from the NestJS backend at http://localhost:3000/.

const DB = {}; // Left for strict legacy compatibility if directly referenced, but ideally unused.

function initDB() {
  // Database gets initialized automatically via backend
}

function initDBRoot() { initDB(); }
function loadDB() {
  return true;
}

function saveDB() {
  // Backend handles persistence
}

function resetDB() {
  // Use backend or clear cache if needed
}

function sendSync(method, endpoint, body) {
  const isCRUD = method === 'POST' || method === 'PATCH' || method === 'DELETE';
  const isLogin = method === 'GET' && endpoint === 'users';
  const shouldLog = isCRUD || isLogin;

  if (shouldLog) console.log(`[Frontend API Call] ${method} request to /${endpoint}`);
  
  var xhr = new XMLHttpRequest();
  xhr.open(method, 'http://localhost:3000/' + endpoint, false); // false makes it synchronous
  const user = getCurrentUser();
  if (user && user.role) {
    xhr.setRequestHeader('x-role', user.role);
  }
  xhr.setRequestHeader('Content-Type', 'application/json');
  try {
    if (body && shouldLog) console.log(`Payload:`, body);
    xhr.send(body ? JSON.stringify(body) : null);
    
    if (xhr.status >= 200 && xhr.status < 300) {
      if (shouldLog) console.log(`[Success] Status ${xhr.status} received from /${endpoint}`);
      if (xhr.responseText) return JSON.parse(xhr.responseText);
      return null;
    } else {
       if (shouldLog) console.error(`[API Error] Status ${xhr.status} from /${endpoint}: `, xhr.responseText);
       if (xhr.status === 403) alert("Access Denied: You do not have permission for this API endpoint.");
       if (method === 'GET' && !endpoint.includes('/')) return [];
       return null;
    }
  } catch (e) {
    if (shouldLog) console.error('[API Network Error]', e);
    if (method === 'GET' && !endpoint.includes('/')) return [];
    return null;
  }
}

// ─── Generic CRUD ─────────────────────────────────────────────────────────────
function getAll(table) {
  return sendSync('GET', table) || [];
}

function getById(table, id) {
  return sendSync('GET', table + '/' + id);
}

function create(table, record) {
  return sendSync('POST', table, record);
}

function update(table, id, changes) {
  return sendSync('PATCH', table + '/' + id, changes);
}

function remove(table, id) {
  const result = sendSync('DELETE', table + '/' + id);
  return result !== null;
}

// ─── ID Generator ─────────────────────────────────────────────────────────────
function genId(prefix) {
  return prefix + Date.now().toString().slice(-6) + Math.floor(Math.random()*100);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function getCurrentUser() {
  try {
    const u = sessionStorage.getItem('ch_user');
    return u ? JSON.parse(u) : null;
  } catch(e) { return null; }
}

function setCurrentUser(user) {
  sessionStorage.setItem('ch_user', JSON.stringify(user));
}

function logout() {
  sessionStorage.removeItem('ch_user');
  const base = getBasePath();
  window.location.href = base + 'login.html';
}

function getBasePath() {
  // Works for both http://localhost:3000/pages/role/page.html
  // and file:// based serving.
  const p = window.location.pathname;
  if (p.includes('/pages/')) return '../../';
  return './';
}

function requireAuth(allowedRoles) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = getBasePath() + 'login.html';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    alert('Access denied. You do not have permission to view this page.');
    window.location.href = getBasePath() + 'login.html';
    return null;
  }
  return user;
}

// ─── Notifications ────────────────────────────────────────────────────────────
function getUnreadCount(userId) {
  const notifications = getAll('notifications') || [];
  return notifications.filter(n => n.userId === userId && !n.read).length;
}

function getUserNotifications(userId) {
  const notifications = getAll('notifications') || [];
  return notifications.filter(n => n.userId === userId);
}

// ─── Auto-init on every page load ─────────────────────────────────────────────
initDB();

