// ConstructHub - Backend API & Local Data Store Manager
// Communicates with NestJS backend at http://localhost:3000/ with JWT Bearer Token authorization.

const SEED_DATA = {
  companies: [
    { id: "COMP001", name: "Apex Builders", code: "apex", domain: "apex.com", ownerEmail: "admin@apex.com", phone: "+91 98000 11111", plan: "Enterprise", billingCycle: "monthly", subscriptionStatus: "active", status: "active", createdAt: "2026-01-01" },
    { id: "COMP002", name: "L&T Infrastructure", code: "ltinfra", domain: "ltinfra.com", ownerEmail: "admin@ltinfra.com", phone: "+91 98000 22222", plan: "Pro", billingCycle: "annual", subscriptionStatus: "active", status: "active", createdAt: "2026-01-15" }
  ],
  users: [
    { id: "U000", name: "Platform Admin", email: "super@ch.com", password: "123456", role: "superuser", companyId: "", phone: "+91 98000 00000", avatar: "PA", status: "active", createdAt: "2026-01-01" },
    { id: "U001", name: "Apex Admin", email: "admin@apex.com", password: "123456", role: "company_admin", companyId: "COMP001", phone: "+91 98000 11111", avatar: "AA", status: "active", createdAt: "2026-01-01" },
    { id: "U002", name: "Rajesh Kumar", email: "pm@apex.com", password: "123456", role: "project_manager", companyId: "COMP001", phone: "+91 98765 43210", avatar: "RK", status: "active", createdAt: "2026-01-05" },
    { id: "U003", name: "Priya Sharma", email: "site@apex.com", password: "123456", role: "site_engineer", companyId: "COMP001", phone: "+91 98765 43211", avatar: "PS", status: "active", createdAt: "2026-01-06" },
    { id: "U004", name: "Amit Verma", email: "finance@apex.com", password: "123456", role: "finance_manager", companyId: "COMP001", phone: "+91 98765 43212", avatar: "AV", status: "active", createdAt: "2026-01-07" },
    { id: "U005", name: "Vikram Patel", email: "client@apex.com", password: "123456", role: "client", companyId: "COMP001", phone: "+91 98765 43213", avatar: "VP", status: "active", createdAt: "2026-01-10" },
    { id: "U006", name: "L&T Admin", email: "admin@ltinfra.com", password: "123456", role: "company_admin", companyId: "COMP002", phone: "+91 98000 22222", avatar: "LA", status: "active", createdAt: "2026-01-15" },
    { id: "U007", name: "Sanjay Mehta", email: "pm@ltinfra.com", password: "123456", role: "project_manager", companyId: "COMP002", phone: "+91 98765 88811", avatar: "SM", status: "active", createdAt: "2026-01-16" },
    { id: "U008", name: "Rohan Gupta", email: "site@ltinfra.com", password: "123456", role: "site_engineer", companyId: "COMP002", phone: "+91 98765 88812", avatar: "RG", status: "active", createdAt: "2026-01-17" },
    { id: "U009", name: "Kavita Rao", email: "finance@ltinfra.com", password: "123456", role: "finance_manager", companyId: "COMP002", phone: "+91 98765 88813", avatar: "KR", status: "active", createdAt: "2026-01-18" },
    { id: "U010", name: "Anand Mahindra", email: "client@ltinfra.com", password: "123456", role: "client", companyId: "COMP002", phone: "+91 98765 88814", avatar: "AM", status: "active", createdAt: "2026-01-20" }
  ],
  projects: [
    { id: "P001", name: "Apex Skyline Tower", companyId: "COMP001", location: "Mumbai, Maharashtra", clientId: "U005", clientName: "Vikram Patel", managerId: "U002", managerName: "Rajesh Kumar", siteEngineerId: "U003", financeManagerId: "U004", budget: 25000000, spent: 18750000, progress: 75, status: "On Track", startDate: "2026-01-01", endDate: "2026-04-30", teamSize: 24, allocations: { Materials: 12000000, Labor: 8000000, Equipment: 3000000, Other: 2000000 }, description: "High-rise luxury residential project in South Mumbai." },
    { id: "P002", name: "Apex Commercial Complex", companyId: "COMP001", location: "Pune, Maharashtra", clientId: "U005", clientName: "Vikram Patel", managerId: "U002", managerName: "Rajesh Kumar", siteEngineerId: "U003", financeManagerId: "U004", budget: 42000000, spent: 25200000, progress: 60, status: "On Track", startDate: "2026-01-15", endDate: "2026-06-15", teamSize: 32, allocations: { Materials: 20000000, Labor: 12000000, Equipment: 6000000, Other: 4000000 }, description: "Modern IT and retail commercial complex." },
    { id: "P003", name: "L&T Infrastructure Project", companyId: "COMP002", location: "Delhi NCR", clientId: "U010", clientName: "Anand Mahindra", managerId: "U007", managerName: "Sanjay Mehta", siteEngineerId: "U008", financeManagerId: "U009", budget: 65000000, spent: 26000000, progress: 40, status: "On Track", startDate: "2026-02-01", endDate: "2026-09-30", teamSize: 50, allocations: { Materials: 30000000, Labor: 20000000, Equipment: 10000000, Other: 5000000 }, description: "Urban rapid transit metro elevated corridor." },
    { id: "P004", name: "L&T Metro Development", companyId: "COMP002", location: "Bangalore, Karnataka", clientId: "U010", clientName: "Anand Mahindra", managerId: "U007", managerName: "Sanjay Mehta", siteEngineerId: "U008", financeManagerId: "U009", budget: 31000000, spent: 6200000, progress: 20, status: "At Risk", startDate: "2026-02-15", endDate: "2026-11-30", teamSize: 22, allocations: { Materials: 15000000, Labor: 9000000, Equipment: 5000000, Other: 2000000 }, description: "Eco-friendly tech park infrastructure." }
  ],
  tasks: [
    { id: "T001", title: "Foundation Concrete Pouring", companyId: "COMP001", projectId: "P001", projectName: "Apex Skyline Tower", assignedTo: "U003", assignedName: "Priya Sharma", priority: "High", status: "In Progress", progress: 75, startDate: "2026-03-01", deadline: "2026-03-08", description: "Pour concrete for blocks A and B.", remarks: "75% done. Block A complete." },
    { id: "T002", title: "Steel Framework Installation", companyId: "COMP001", projectId: "P001", projectName: "Apex Skyline Tower", assignedTo: "U003", assignedName: "Priya Sharma", priority: "Medium", status: "Pending", progress: 0, startDate: "2026-03-10", deadline: "2026-03-20", description: "Install steel framework for floors 1-5.", remarks: "" },
    { id: "T003", title: "Electrical Wiring - Floor 2", companyId: "COMP001", projectId: "P002", projectName: "Apex Commercial Complex", assignedTo: "U003", assignedName: "Priya Sharma", priority: "High", status: "In Progress", progress: 60, startDate: "2026-03-05", deadline: "2026-03-12", description: "Complete electrical wiring for Floor 2.", remarks: "60% done." },
    { id: "T004", title: "Plumbing Line Inspection", companyId: "COMP001", projectId: "P002", projectName: "Apex Commercial Complex", assignedTo: "U003", assignedName: "Priya Sharma", priority: "Medium", status: "Completed", progress: 100, startDate: "2026-02-25", deadline: "2026-03-05", description: "Inspect main water supply pipelines.", remarks: "Passed inspection." },
    { id: "T005", title: "Pier Cap Casting - Zone 1", companyId: "COMP002", projectId: "P003", projectName: "L&T Infrastructure Project", assignedTo: "U008", assignedName: "Rohan Gupta", priority: "High", status: "In Progress", progress: 50, startDate: "2026-03-01", deadline: "2026-03-15", description: "Cast pier caps for metro pillars 10-15.", remarks: "Zone 1 half done." },
    { id: "T006", title: "Viaduct Girder Launching", companyId: "COMP002", projectId: "P003", projectName: "L&T Infrastructure Project", assignedTo: "U008", assignedName: "Rohan Gupta", priority: "High", status: "Pending", progress: 0, startDate: "2026-03-16", deadline: "2026-03-30", description: "Launch U-girders using crane.", remarks: "" },
    { id: "T007", title: "Land Clearing & Excavation", companyId: "COMP002", projectId: "P004", projectName: "L&T Metro Development", assignedTo: "U008", assignedName: "Rohan Gupta", priority: "Medium", status: "Completed", progress: 100, startDate: "2026-02-15", deadline: "2026-03-01", description: "Clear land area and finish mass excavation.", remarks: "Site ready for foundation." },
    { id: "T008", title: "Drainage Pipeline Installation", companyId: "COMP002", projectId: "P004", projectName: "L&T Metro Development", assignedTo: "U008", assignedName: "Rohan Gupta", priority: "Low", status: "Pending", progress: 0, startDate: "2026-03-10", deadline: "2026-03-25", description: "Install storm water drainage pipes.", remarks: "" }
  ],
  bills: [
    { id: "B001", billNumber: "INV-APEX-001", companyId: "COMP001", projectId: "P001", projectName: "Apex Skyline Tower", clientId: "U005", clientName: "Vikram Patel", amount: 4500000, date: "2026-03-01", dueDate: "2026-03-15", status: "Pending Approval", priority: "High", description: "Foundation completion billing." },
    { id: "B002", billNumber: "INV-APEX-002", companyId: "COMP001", projectId: "P002", projectName: "Apex Commercial Complex", clientId: "U005", clientName: "Vikram Patel", amount: 8200000, date: "2026-02-20", dueDate: "2026-03-05", status: "Paid", priority: "Medium", description: "Structure milestone billing." },
    { id: "B003", billNumber: "INV-LT-001", companyId: "COMP002", projectId: "P003", projectName: "L&T Infrastructure Project", clientId: "U010", clientName: "Anand Mahindra", amount: 12500000, date: "2026-03-01", dueDate: "2026-03-20", status: "Approved", priority: "High", description: "Metro pillar foundation milestone." },
    { id: "B004", billNumber: "INV-LT-002", companyId: "COMP002", projectId: "P004", projectName: "L&T Metro Development", clientId: "U010", clientName: "Anand Mahindra", amount: 3500000, date: "2026-02-28", dueDate: "2026-03-14", status: "Pending Approval", priority: "Medium", description: "Land excavation milestone billing." }
  ],
  expenses: [
    { id: "E001", companyId: "COMP001", projectId: "P001", projectName: "Apex Skyline Tower", category: "Materials", amount: 450000, date: "2026-03-02", recordedBy: "U004", description: "500 bags OPC Grade 53 cement." },
    { id: "E002", companyId: "COMP001", projectId: "P002", projectName: "Apex Commercial Complex", category: "Equipment", amount: 280000, date: "2026-03-01", recordedBy: "U004", description: "Tower crane monthly rental." },
    { id: "E003", companyId: "COMP002", projectId: "P003", projectName: "L&T Infrastructure Project", category: "Materials", amount: 1850000, date: "2026-03-01", recordedBy: "U009", description: "TMT steel rebar shipment for metro girders." },
    { id: "E004", companyId: "COMP002", projectId: "P004", projectName: "L&T Metro Development", category: "Labor", amount: 350000, date: "2026-03-02", recordedBy: "U009", description: "Site labor payout for excavation." }
  ],
  messages: [
    { id: "M001", companyId: "COMP001", senderId: "U002", senderName: "Rajesh Kumar", receiverId: "U003", receiverName: "Priya Sharma", text: "Please complete foundation inspection for Apex Skyline Tower by 3 PM.", timestamp: "2026-03-03 10:30" },
    { id: "M002", companyId: "COMP002", senderId: "U007", senderName: "Sanjay Mehta", receiverId: "U008", receiverName: "Rohan Gupta", text: "Check pier cap alignment for metro pillar 12.", timestamp: "2026-03-03 11:15" }
  ],
  notifications: [
    { id: "N001", companyId: "COMP001", userId: "U003", title: "New Task Assigned", message: "Task 'Steel Framework Installation' assigned by Rajesh Kumar.", date: "2026-03-02", read: false },
    { id: "N002", companyId: "COMP001", userId: "U002", title: "Bill Created", message: "Bill INV-APEX-001 created.", date: "2026-03-01", read: true },
    { id: "N003", companyId: "COMP002", userId: "U008", title: "Metro Site Log Due", message: "Submit daily site report for Metro Corridor.", date: "2026-03-03", read: false },
    { id: "N004", companyId: "COMP002", userId: "U007", title: "Bill Approved", message: "Bill INV-LT-001 approved by client.", date: "2026-03-02", read: true }
  ],
  reports: [
    { id: "R001", companyId: "COMP001", title: "Daily Site Log - Apex Skyline Tower", projectId: "P001", projectName: "Apex Skyline Tower", submittedBy: "U003", reporterName: "Priya Sharma", date: "2026-03-02", workDone: "Concrete pouring for Block A complete.", issues: "None.", photos: [] },
    { id: "R002", companyId: "COMP002", title: "Metro Corridor Inspection Log", projectId: "P003", projectName: "L&T Metro Corridor", submittedBy: "U008", reporterName: "Rohan Gupta", date: "2026-03-02", workDone: "Pillar 12 pier cap alignment checked.", issues: "Traffic diversion required on main highway.", photos: [] }
  ]
};

function resetLocalDatabase() {
  if (typeof localStorage === 'undefined') return;
  for (const table in SEED_DATA) {
    localStorage.setItem('ch_' + table, JSON.stringify(SEED_DATA[table]));
  }
  localStorage.setItem('ch_db_version', '2.0_v7_attack10c');
}

function syncServerBootId() {
  if (typeof fetch === 'undefined') return;
  const baseUrl = getApiBaseUrl();
  fetch(baseUrl + '/health')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data && data.serverBootId) {
        const savedBootId = localStorage.getItem('ch_server_boot_id');
        if (savedBootId && savedBootId !== data.serverBootId) {
          console.log('[Server Restart Detected] Resetting local data to seed defaults.');
          resetLocalDatabase();
        }
        localStorage.setItem('ch_server_boot_id', data.serverBootId);
      }
    })
    .catch(() => { /* offline / backend unreachable — keep local data */ });
}

function initDB() {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem('ch_db_version') !== '2.0_v7_attack10c') {
    resetLocalDatabase();
    return;
  }
  for (const table in SEED_DATA) {
    if (!localStorage.getItem('ch_' + table)) {
      localStorage.setItem('ch_' + table, JSON.stringify(SEED_DATA[table]));
    }
  }
}

function getLocalData(table) {
  try {
    initDB();
    const d = localStorage.getItem('ch_' + table);
    const parsed = d ? JSON.parse(d) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    if (SEED_DATA[table] && Array.isArray(SEED_DATA[table]) && SEED_DATA[table].length > 0) {
      setLocalData(table, SEED_DATA[table]);
      return SEED_DATA[table];
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return SEED_DATA[table] || [];
  }
}

function setLocalData(table, data) {
  try {
    localStorage.setItem('ch_' + table, JSON.stringify(data));
  } catch (e) {}
}

const _getCache = {};

function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

function invalidateGetCache(table) {
  const prefix = 'GET:' + table;
  Object.keys(_getCache).forEach(k => {
    if (k === prefix || k.startsWith(prefix + '/')) delete _getCache[k];
  });
}

function sendSync(method, endpoint, body) {
  const table = endpoint.split('/')[0];
  const targetId = endpoint.split('/')[1];
  const isAuthEndpoint = table === 'auth';

  const backendTables = ['users', 'companies', 'projects', 'auth'];
  if (!backendTables.includes(table)) {
    return handleLocalFallback(method, endpoint, body);
  }

  const cacheKey = method + ':' + endpoint;
  if (method === 'GET' && _getCache[cacheKey] !== undefined) {
    return _getCache[cacheKey];
  }

  const isCRUD = method === 'POST' || method === 'PATCH' || method === 'DELETE';
  const isLogin = method === 'GET' && endpoint === 'users';
  const shouldLog = isCRUD || isLogin;

  if (shouldLog) console.log(`[Frontend API Call] ${method} request to /${endpoint}`);

  var xhr = new XMLHttpRequest();
  try {
    xhr.open(method, getApiBaseUrl() + '/' + endpoint, false); // synchronous — do NOT set xhr.timeout (throws in browsers)
    const token = sessionStorage.getItem('ch_token');
    if (token) {
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    }
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (body && shouldLog) console.log(`Payload:`, body);
    xhr.send(body ? JSON.stringify(body) : null);
    
    if (xhr.status >= 200 && xhr.status < 300) {
      if (shouldLog) console.log(`[Success] Status ${xhr.status} received from /${endpoint}`);
      if (xhr.responseText) {
        const resData = JSON.parse(xhr.responseText);

        if (!isAuthEndpoint) {
          let localList = getLocalData(table);
          if (method === 'GET' && !targetId && Array.isArray(resData)) {
            if (resData.length > 0) {
              setLocalData(table, resData);
            }
          } else if (method === 'POST' && resData && resData.id) {
            localList = localList.filter(item => item.id !== resData.id);
            localList.unshift(resData);
            setLocalData(table, localList);
          } else if (method === 'PATCH' && targetId && resData) {
            const idx = localList.findIndex(item => item.id === targetId);
            if (idx > -1) localList[idx] = { ...localList[idx], ...resData };
            setLocalData(table, localList);
          } else if (method === 'DELETE' && targetId) {
            localList = localList.filter(item => item.id !== targetId);
            setLocalData(table, localList);
          }
        }
        if (method === 'GET') _getCache[cacheKey] = resData;
        if (isCRUD) invalidateGetCache(table);
        return resData;
      }
      if (method === 'DELETE' && targetId) {
        let localList = getLocalData(table).filter(item => item.id !== targetId);
        setLocalData(table, localList);
      }
      if (isCRUD) invalidateGetCache(table);
      return true;
    } else if (xhr.status === 401) {
      // 401 Unauthorized: Session Expired
      console.warn('[API Error 401] Session expired or unauthorized token.');
      sessionStorage.removeItem('ch_token');
      sessionStorage.removeItem('ch_user');
      if (typeof window !== 'undefined' && !window.location.pathname.endsWith('login.html')) {
        if (typeof showToast === 'function') showToast('Session expired. Please log in again.', 'error');
        setTimeout(() => {
          const base = typeof getBasePath === 'function' ? getBasePath() : './';
          window.location.href = base + 'login.html';
        }, 800);
      }
      let msg = 'Session expired. Please sign in again.';
      try { msg = JSON.parse(xhr.responseText).message || msg; } catch(e){}
      return { error: true, status: 401, message: Array.isArray(msg) ? msg.join(', ') : msg };
    } else {
      // 400, 403, 404, 429, 500 API Errors — return backend error without silent local fallback
      if (shouldLog) console.error(`[API Error] Status ${xhr.status} from /${endpoint}: `, xhr.responseText);
      try {
        const errJson = JSON.parse(xhr.responseText);
        const errMsg = Array.isArray(errJson.message) ? errJson.message.join(', ') : (errJson.message || 'API error');
        return { error: true, status: xhr.status, message: errMsg };
      } catch (e) {
        return { error: true, status: xhr.status, message: xhr.responseText || 'API error' };
      }
    }
  } catch (e) {
    console.error(`[Network Error] ${method} /${endpoint}:`, e);
    const hasToken = !!sessionStorage.getItem('ch_token');
    if (hasToken || isAuthEndpoint) {
      return {
        error: true,
        status: 0,
        message: hasToken
          ? 'Backend service unreachable. Protected operations require live server connection.'
          : 'Unable to connect to authentication server. Please ensure the backend is running.',
      };
    }
    return handleLocalFallback(method, endpoint, body);
  }
}

/** Async login — preferred over sync XHR for auth (avoids browser blocking). */
function loginRequest(email, password) {
  return fetch(getApiBaseUrl() + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
    .then(function (res) {
      return res.json().then(function (data) {
        if (res.ok) return data;
        const msg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Invalid email or password.');
        return { error: true, status: res.status, message: msg };
      });
    })
    .catch(function () {
      return { error: true, status: 0, message: 'Unable to connect to authentication server. Please ensure the backend is running.' };
    });
}

function handleLocalFallback(method, endpoint, body) {
  const parts = endpoint.split('/');
  const table = parts[0];
  const id = parts[1];

  let list = getLocalData(table);

  if (method === 'GET') {
    if (table === 'companies' && endpoint.includes('/subscription') && id) {
      const c = list.find(item => item.id === id);
      if (!c) return null;
      const planLimits = { Basic: { userLimit: 10, projectLimit: 3, monthlyPrice: 4999 }, Pro: { userLimit: 50, projectLimit: 15, monthlyPrice: 9999 }, Enterprise: { userLimit: 500, projectLimit: 100, monthlyPrice: 19999 } };
      const plan = c.plan || 'Basic';
      const cfg = planLimits[plan] || planLimits.Basic;
      const extraUsers = c.overageEnabled ? (c.extraUsers || 0) : 0;
      const extraProjects = c.overageEnabled ? (c.extraProjects || 0) : 0;
      const userOverageFee = extraUsers * 499;
      const projectOverageFee = extraProjects * 1999;
      const overageRevenue = userOverageFee + projectOverageFee;
      const baseMonthlyPrice = cfg.monthlyPrice;
      const totalMonthlyFee = baseMonthlyPrice + overageRevenue;
      return {
        companyId: c.id,
        companyName: c.name,
        code: c.code,
        domain: c.domain,
        plan,
        planConfig: { ...cfg, userLimit: c.customUserLimit || cfg.userLimit, projectLimit: c.customProjectLimit || cfg.projectLimit },
        billingCycle: c.billingCycle || 'monthly',
        subscriptionStatus: c.subscriptionStatus || 'active',
        overageEnabled: !!c.overageEnabled,
        extraUsers,
        extraProjects,
        userOverageFee,
        projectOverageFee,
        overageRates: { extraUserMonthly: 499, extraProjectMonthly: 1999 },
        baseMonthlyPrice,
        overageRevenue,
        totalMonthlyFee,
        subscriptionStartedAt: c.createdAt || '2026-01-01',
        nextBillingDate: '2026-04-01',
      };
    }
    if (id) return list.find(item => item.id === id) || null;
    return list;
  }

  if (method === 'POST') {
    if (table === 'users' && body && body.companyId) {
      const comps = getLocalData('companies') || [];
      const compIdx = comps.findIndex(c => c.id === body.companyId);
      if (compIdx > -1) {
        const comp = comps[compIdx];
        const allUsers = getLocalData('users') || [];
        const currentUsers = allUsers.filter(u => u.companyId === comp.id).length;
        const limits = { Basic: 10, Pro: 50, Enterprise: 500 };
        const userLimit = comp.customUserLimit || limits[comp.plan || 'Basic'] || 10;
        if (currentUsers >= userLimit) {
          if (!comp.overageEnabled) {
            return { error: true, status: 403, message: `User limit reached (${currentUsers}/${userLimit}) for your ${comp.plan || 'Basic'} plan. Please upgrade to Pro or enable overage billing.` };
          } else {
            comps[compIdx].extraUsers = (comps[compIdx].extraUsers || 0) + 1;
            setLocalData('companies', comps);
          }
        }
      }
    }
    if (table === 'projects' && body && body.companyId) {
      const comps = getLocalData('companies') || [];
      const compIdx = comps.findIndex(c => c.id === body.companyId);
      if (compIdx > -1) {
        const comp = comps[compIdx];
        const allProjs = getLocalData('projects') || [];
        const currentProjs = allProjs.filter(p => p.companyId === comp.id).length;
        const limits = { Basic: 3, Pro: 15, Enterprise: 100 };
        const projLimit = comp.customProjectLimit || limits[comp.plan || 'Basic'] || 3;
        if (currentProjs >= projLimit) {
          if (!comp.overageEnabled) {
            return { error: true, status: 403, message: `Project limit reached (${currentProjs}/${projLimit}) for your ${comp.plan || 'Basic'} plan. Please upgrade to Pro or enable overage billing.` };
          } else {
            comps[compIdx].extraProjects = (comps[compIdx].extraProjects || 0) + 1;
            setLocalData('companies', comps);
          }
        }
      }
    }

    const newRecord = { ...body };
    if (!newRecord.id) newRecord.id = genId(table.slice(0, 1).toUpperCase());
    list.unshift(newRecord);
    setLocalData(table, list);
    return newRecord;
  }

  if (method === 'PATCH' && id) {
    if (table === 'companies' && endpoint.includes('/overage')) {
      const idx = list.findIndex(item => item.id === id);
      if (idx > -1) {
        const overageEnabled = body.overageEnabled !== undefined ? body.overageEnabled : (body.enabled !== undefined ? body.enabled : true);
        list[idx] = {
          ...list[idx],
          overageEnabled: !!overageEnabled,
          extraUsers: overageEnabled ? Math.max(0, Number(body.extraUsers) || 0) : 0,
          extraProjects: overageEnabled ? Math.max(0, Number(body.extraProjects) || 0) : 0,
        };
        setLocalData(table, list);
        return list[idx];
      }
    }
    const idx = list.findIndex(item => item.id === id);
    if (idx > -1) {
      list[idx] = { ...list[idx], ...body };
      setLocalData(table, list);
      return list[idx];
    }
    return null;
  }

  if (method === 'DELETE' && id) {
    list = list.filter(item => item.id !== id);
    setLocalData(table, list);
    return true;
  }

  return Array.isArray(list) ? list : [];
}

// ─── Generic CRUD ─────────────────────────────────────────────────────────────
function getAll(table) {
  const result = sendSync('GET', table);
  if (Array.isArray(result) && result.length > 0) return result;
  return getLocalData(table);
}

function getById(table, id) {
  const result = sendSync('GET', table + '/' + id);
  if (result && !result.error) return result;
  return getLocalData(table).find(item => item.id === id) || null;
}

function create(table, record) {
  invalidateGetCache(table);
  return sendSync('POST', table, record);
}

function update(table, id, changes) {
  invalidateGetCache(table);
  return sendSync('PATCH', table + '/' + id, changes);
}

function remove(table, id) {
  invalidateGetCache(table);
  const result = sendSync('DELETE', table + '/' + id);
  if (result && result.error) return false;
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
  sessionStorage.removeItem('ch_token');
  const base = getBasePath();
  window.location.href = base + 'login.html';
}

function getBasePath() {
  const p = window.location.pathname;
  if (p.includes('/pages/')) return '../../';
  return './';
}

function requireAuth(allowedRoles) {
  const token = sessionStorage.getItem('ch_token');
  const user = getCurrentUser();
  if (!token || !user) {
    sessionStorage.removeItem('ch_token');
    sessionStorage.removeItem('ch_user');
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

// ─── Auto-init on page load ───────────────────────────────────────────────────
initDB();
syncServerBootId();
