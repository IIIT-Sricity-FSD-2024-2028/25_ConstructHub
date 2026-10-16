// ConstructHub - API & Unified Data Service
// Connects to NestJS Backend with fallback to LocalStorage

const API_BASE_URL = typeof window !== 'undefined' && window.location && window.location.port === '3000'
  ? window.location.origin
  : 'http://localhost:3000';

export const SEED_DATA = {
  companies: [
    { id: "COMP001", name: "Apex Builders", code: "apex", domain: "apex.com", ownerEmail: "admin@apex.com", phone: "+91 98000 11111", plan: "Enterprise", billingCycle: "monthly", subscriptionStatus: "active", status: "active", createdAt: "2026-01-01", customUserLimit: 500, customProjectLimit: 100, overageEnabled: true },
    { id: "COMP002", name: "L&T Infrastructure", code: "ltinfra", domain: "ltinfra.com", ownerEmail: "admin@ltinfra.com", phone: "+91 98000 22222", plan: "Pro", billingCycle: "annual", subscriptionStatus: "active", status: "active", createdAt: "2026-01-15", customUserLimit: 50, customProjectLimit: 15, overageEnabled: false }
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
    { id: "P001", name: "Apex Skyline Tower", companyId: "COMP001", location: "Mumbai, Maharashtra", clientId: "U005", clientName: "Vikram Patel", managerId: "U002", managerName: "Rajesh Kumar", siteEngineerId: "U003", financeManagerId: "U004", budget: 25000000, spent: 450000, progress: 75, status: "On Track", startDate: "2026-01-01", endDate: "2026-04-30", teamSize: 24, allocations: { Materials: 12000000, Labor: 8000000, Equipment: 3000000, Other: 2000000 }, description: "High-rise luxury residential project in South Mumbai." },
    { id: "P002", name: "Apex Commercial Complex", companyId: "COMP001", location: "Pune, Maharashtra", clientId: "U005", clientName: "Vikram Patel", managerId: "U002", managerName: "Rajesh Kumar", siteEngineerId: "U003", financeManagerId: "U004", budget: 42000000, spent: 280000, progress: 60, status: "On Track", startDate: "2026-01-15", endDate: "2026-06-15", teamSize: 32, allocations: { Materials: 20000000, Labor: 12000000, Equipment: 6000000, Other: 4000000 }, description: "Modern IT and retail commercial complex." },
    { id: "P003", name: "L&T Infrastructure Project", companyId: "COMP002", location: "Delhi NCR", clientId: "U010", clientName: "Anand Mahindra", managerId: "U007", managerName: "Sanjay Mehta", siteEngineerId: "U008", financeManagerId: "U009", budget: 65000000, spent: 1850000, progress: 40, status: "On Track", startDate: "2026-02-01", endDate: "2026-09-30", teamSize: 50, allocations: { Materials: 30000000, Labor: 20000000, Equipment: 10000000, Other: 5000000 }, description: "Urban rapid transit metro elevated corridor." },
    { id: "P004", name: "L&T Metro Development", companyId: "COMP002", location: "Bangalore, Karnataka", clientId: "U010", clientName: "Anand Mahindra", managerId: "U007", managerName: "Sanjay Mehta", siteEngineerId: "U008", financeManagerId: "U009", budget: 31000000, spent: 350000, progress: 20, status: "At Risk", startDate: "2026-02-15", endDate: "2026-11-30", teamSize: 22, allocations: { Materials: 15000000, Labor: 9000000, Equipment: 5000000, Other: 2000000 }, description: "Eco-friendly tech park infrastructure." }
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
    { id: "B001", billNumber: "INV-APEX-001", companyId: "COMP001", projectId: "P001", projectName: "Apex Skyline Tower", clientId: "U005", clientName: "Vikram Patel", amount: 4500000, date: "2026-03-01", dueDate: "2026-03-15", status: "Pending Decision", priority: "High", milestone: "Foundation Completion", description: "Foundation completion billing." },
    { id: "B002", billNumber: "INV-APEX-002", companyId: "COMP001", projectId: "P002", projectName: "Apex Commercial Complex", clientId: "U005", clientName: "Vikram Patel", amount: 8200000, date: "2026-02-20", dueDate: "2026-03-05", status: "Accepted", priority: "Medium", milestone: "Structure Milestone", decisionDate: "2026-03-02", description: "Structure milestone billing." },
    { id: "B003", billNumber: "INV-LT-001", companyId: "COMP002", projectId: "P003", projectName: "L&T Infrastructure Project", clientId: "U010", clientName: "Anand Mahindra", amount: 12500000, date: "2026-03-01", dueDate: "2026-03-20", status: "Accepted", priority: "High", milestone: "Metro Pillar Foundation", decisionDate: "2026-03-02", description: "Metro pillar foundation milestone." },
    { id: "B004", billNumber: "INV-LT-002", companyId: "COMP002", projectId: "P004", projectName: "L&T Metro Development", clientId: "U010", clientName: "Anand Mahindra", amount: 3500000, date: "2026-02-28", dueDate: "2026-03-14", status: "Pending Decision", priority: "Medium", milestone: "Land Excavation", description: "Land excavation milestone billing." }
  ],
  expenses: [
    { id: "E001", companyId: "COMP001", projectId: "P001", projectName: "Apex Skyline Tower", category: "Materials", amount: 450000, date: "2026-03-02", recordedBy: "U004", description: "500 bags OPC Grade 53 cement." },
    { id: "E002", companyId: "COMP001", projectId: "P002", projectName: "Apex Commercial Complex", category: "Equipment", amount: 280000, date: "2026-03-01", recordedBy: "U004", description: "Tower crane monthly rental." },
    { id: "E003", companyId: "COMP002", projectId: "P003", projectName: "L&T Infrastructure Project", category: "Materials", amount: 1850000, date: "2026-03-01", recordedBy: "U009", description: "TMT steel rebar shipment for metro girders." },
    { id: "E004", companyId: "COMP002", projectId: "P004", projectName: "L&T Metro Development", category: "Labor", amount: 350000, date: "2026-03-02", recordedBy: "U009", description: "Site labor payout for excavation." }
  ],
  messages: [
    { id: "M001", companyId: "COMP001", senderId: "U002", senderName: "Rajesh Kumar", from: "U002", to: "U003", receiverId: "U003", receiverName: "Priya Sharma", text: "Hi Priya, what is the status of the Block A foundation concrete pour today?", timestamp: "2026-03-03 09:45" },
    { id: "M002", companyId: "COMP001", senderId: "U003", senderName: "Priya Sharma", from: "U003", to: "U002", receiverId: "U002", receiverName: "Rajesh Kumar", text: "Good morning sir! The RMC batching trucks are on site and pouring is underway for raft section 2.", timestamp: "2026-03-03 10:10" },
    { id: "M003", companyId: "COMP001", senderId: "U002", senderName: "Rajesh Kumar", from: "U002", to: "U003", receiverId: "U003", receiverName: "Priya Sharma", text: "Please complete foundation inspection for Apex Skyline Tower by 3 PM.", timestamp: "2026-03-03 10:30" },
    { id: "M004", companyId: "COMP001", senderId: "U003", senderName: "Priya Sharma", from: "U003", to: "U002", receiverId: "U002", receiverName: "Rajesh Kumar", text: "Will do. Taking concrete cube strength samples for laboratory testing right after.", timestamp: "2026-03-03 10:32" },
    { id: "M005", companyId: "COMP001", senderId: "U005", senderName: "Vikram Patel", from: "U005", to: "U002", receiverId: "U002", receiverName: "Rajesh Kumar", text: "Hi Rajesh, please let me know when we can expect the structural steel framework update.", timestamp: "2026-03-02 15:20" },
    { id: "M006", companyId: "COMP001", senderId: "U002", senderName: "Rajesh Kumar", from: "U002", to: "U005", receiverId: "U005", receiverName: "Vikram Patel", text: "Hello Vikram! Steel framework installation is scheduled starting March 10th. Milestone billing INV-APEX-001 is ready for your review.", timestamp: "2026-03-02 15:45" },
    { id: "M007", companyId: "COMP001", senderId: "U004", senderName: "Amit Verma", from: "U004", to: "U002", receiverId: "U002", receiverName: "Rajesh Kumar", text: "Rajesh, we recorded the 500 bags OPC Grade 53 cement expense (₹4.50L) for Skyline Tower.", timestamp: "2026-03-02 11:30" },
    { id: "M008", companyId: "COMP001", senderId: "U002", senderName: "Rajesh Kumar", from: "U002", to: "U004", receiverId: "U004", receiverName: "Amit Verma", text: "Acknowledged Amit. Delivery challans and weighbridge slips are verified on site.", timestamp: "2026-03-02 11:50" },
    { id: "M009", companyId: "COMP002", senderId: "U007", senderName: "Sanjay Mehta", from: "U007", to: "U008", receiverId: "U008", receiverName: "Rohan Gupta", text: "Check pier cap alignment for metro pillar 12.", timestamp: "2026-03-03 11:15" },
    { id: "M010", companyId: "COMP002", senderId: "U008", senderName: "Rohan Gupta", from: "U008", to: "U007", receiverId: "U007", receiverName: "Sanjay Mehta", text: "Alignment verified. Launching girder repositioning complete.", timestamp: "2026-03-03 11:35" }
  ],
  notifications: [
    { id: "N006", companyId: "COMP001", userId: "U001", title: "Company Profile Active", body: "Your company profile for Apex Builders is verified and active.", message: "Your company profile for Apex Builders is verified and active.", date: "2026-03-01", time: "3 days ago", read: false },
    { id: "N007", companyId: "COMP001", userId: "U001", title: "Subscription Status", body: "Apex Builders is currently on Enterprise tier.", message: "Apex Builders is currently on Enterprise tier.", date: "2026-03-02", time: "2 days ago", read: false },
    { id: "N001", companyId: "COMP001", userId: "U003", title: "New Task Assigned", body: "Task 'Steel Framework Installation' assigned by Rajesh Kumar.", message: "Task 'Steel Framework Installation' assigned by Rajesh Kumar.", date: "2026-03-02", time: "2 days ago", read: false },
    { id: "N002", companyId: "COMP001", userId: "U002", title: "Bill Created", body: "Bill INV-APEX-001 created.", message: "Bill INV-APEX-001 created.", date: "2026-03-01", time: "3 days ago", read: true },
    { id: "N003", companyId: "COMP002", userId: "U008", title: "Metro Site Log Due", body: "Submit daily site report for Metro Corridor.", message: "Submit daily site report for Metro Corridor.", date: "2026-03-03", time: "Yesterday", read: false },
    { id: "N004", companyId: "COMP002", userId: "U007", title: "Bill Approved", body: "Bill INV-LT-001 approved by client.", message: "Bill INV-LT-001 approved by client.", date: "2026-03-02", time: "2 days ago", read: true }
  ],
  reports: [
    { id: "R001", companyId: "COMP001", title: "Daily Site Log - Apex Skyline Tower", projectId: "P001", projectName: "Apex Skyline Tower", submittedBy: "U003", reporterName: "Priya Sharma", date: "2026-03-02", status: "Completed", workDone: "Concrete pouring for Block A complete.", issues: "None.", photos: [], materials: [{ name: "Cement", qty: 50, unit: "bags" }] },
    { id: "R002", companyId: "COMP002", title: "Metro Corridor Inspection Log", projectId: "P003", projectName: "L&T Infrastructure Project", submittedBy: "U008", reporterName: "Rohan Gupta", date: "2026-03-02", status: "In Progress", workDone: "Pillar 12 pier cap alignment checked.", issues: "Traffic diversion required on main highway.", photos: [], materials: [] }
  ],
  inquiries: [
    { id: "INQ001", name: "Sunil Verma", email: "sunil@vermaconstructions.com", phone: "9876543210", company: "Verma Infra", message: "Interested in Enterprise plan demo for our road projects.", status: "Pending", createdAt: "2026-03-01" }
  ]
};

// ── Database Initialization ───────────────────────────────────────────────
export async function syncServerBootId() {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (res.ok) {
      const data = await res.json();
      const storedBootId = localStorage.getItem('ch_server_boot_id');
      const storedDbVersion = localStorage.getItem('ch_db_version');
      const CURRENT_VERSION = '2.0_v12_whatsapp_ui';
      if (data.serverBootId && (data.serverBootId !== storedBootId || storedDbVersion !== CURRENT_VERSION)) {
        localStorage.setItem('ch_server_boot_id', data.serverBootId);
        localStorage.setItem('ch_db_version', CURRENT_VERSION);
        for (const table in SEED_DATA) {
          localStorage.setItem('ch_' + table, JSON.stringify(SEED_DATA[table]));
        }
      }
    }
  } catch (e) {}
}

export function initDB() {
  if (typeof localStorage === 'undefined') return;
  const CURRENT_VERSION = '2.0_v12_whatsapp_ui';
  const storedDbVersion = localStorage.getItem('ch_db_version');
  if (storedDbVersion !== CURRENT_VERSION) {
    localStorage.setItem('ch_db_version', CURRENT_VERSION);
    for (const table in SEED_DATA) {
      localStorage.setItem('ch_' + table, JSON.stringify(SEED_DATA[table]));
    }
  } else {
    for (const table in SEED_DATA) {
      if (!localStorage.getItem('ch_' + table)) {
        localStorage.setItem('ch_' + table, JSON.stringify(SEED_DATA[table]));
      }
    }
  }

  // Ensure project.spent in local storage is strictly computed from expenses
  try {
    const rawProjs = localStorage.getItem('ch_projects');
    const rawExps = localStorage.getItem('ch_expenses');
    if (rawProjs && rawExps) {
      const projs = JSON.parse(rawProjs);
      const exps = JSON.parse(rawExps);
      const synced = projs.map(p => {
        const pExps = exps.filter(e => e.projectId === p.id);
        const total = pExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return { ...p, spent: total };
      });
      localStorage.setItem('ch_projects', JSON.stringify(synced));
    }
  } catch (e) {}

  // Detect server restart or version mismatch asynchronously
  syncServerBootId();
}

export function getLocal(table) {
  try {
    initDB();
    const d = localStorage.getItem('ch_' + table);
    const parsed = d ? JSON.parse(d) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    if (SEED_DATA[table]) {
      localStorage.setItem('ch_' + table, JSON.stringify(SEED_DATA[table]));
      return SEED_DATA[table];
    }
    return parsed || [];
  } catch (e) {
    return SEED_DATA[table] || [];
  }
}

export function setLocal(table, data) {
  try {
    localStorage.setItem('ch_' + table, JSON.stringify(data));
  } catch (e) {}
}

// ── Unified Request with Network Fallback ─────────────────────────────────
async function apiRequest(endpoint, options = {}) {
  const token = sessionStorage.getItem('ch_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${API_BASE_URL}/${endpoint.replace(/^\//, '')}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = data && data.message
        ? (Array.isArray(data.message) ? data.message.join(', ') : data.message)
        : `Request failed with status ${res.status}`;
      return { error: true, status: res.status, message: msg };
    }

    return data;
  } catch (err) {
    // Network unreachable or offline -> fallback handled by caller or local mock
    return { error: true, status: 0, message: err.message || 'Network error' };
  }
}

// ── Exported API Object ───────────────────────────────────────────────────
export const api = {
  // --- Auth ---
  async login(email, password) {
    let res = await apiRequest('auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    // If failed, retry with alternate common default password (123456 <-> password123)
    if ((!res || res.error) && password === '123456') {
      const altRes = await apiRequest('auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: 'password123' })
      });
      if (altRes && altRes.accessToken) res = altRes;
    } else if ((!res || res.error) && password === 'password123') {
      const altRes = await apiRequest('auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: '123456' })
      });
      if (altRes && altRes.accessToken) res = altRes;
    }

    if (res && res.accessToken) {
      sessionStorage.setItem('ch_token', res.accessToken);
      sessionStorage.setItem('ch_user', JSON.stringify(res.user));
      return { success: true, user: res.user, token: res.accessToken };
    }

    if (res && res.error && res.status !== 0) {
      return { error: true, message: res.message || 'Invalid email or password.' };
    }

    // Fallback: check seeded users in local store ONLY if offline (status === 0)
    const users = getLocal('users');
    const u = users.find(x => x.email.toLowerCase() === email.trim().toLowerCase());
    if (u && u.password === password) {
      if (u.status === 'inactive') {
        return { error: true, message: 'Account is locked or inactive. Please contact admin.' };
      }
      const token = `mock_jwt_${u.id}_${u.role || 'client'}_${u.companyId || 'COMP001'}_${Date.now()}`;
      sessionStorage.setItem('ch_token', token);
      sessionStorage.setItem('ch_user', JSON.stringify(u));
      return { success: true, user: u, token };
    }

    return { error: true, message: res?.message || 'Invalid email or password.' };
  },

  getCurrentUser() {
    try {
      const u = sessionStorage.getItem('ch_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    sessionStorage.setItem('ch_user', JSON.stringify(user));
  },

  getToken() {
    return sessionStorage.getItem('ch_token');
  },

  logout() {
    sessionStorage.removeItem('ch_token');
    sessionStorage.removeItem('ch_user');
    window.location.href = '/login';
  },

  // --- Companies ---
  async getCompanies() {
    const res = await apiRequest('companies');
    if (Array.isArray(res)) {
      setLocal('companies', res);
      return res;
    }
    return getLocal('companies');
  },

  async getCompanyById(id) {
    const res = await apiRequest(`companies/${id}`);
    if (res && !res.error) return res;
    return getLocal('companies').find(c => c.id === id) || null;
  },

  async registerCompany(payload) {
    const res = await apiRequest('companies/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res && res.error && res.status !== 0) {
      return res;
    }

    if (res && !res.error) {
      // sync local
      if (res.company) {
        const comps = getLocal('companies');
        comps.unshift(res.company);
        setLocal('companies', comps);
      }
      if (res.admin) {
        const users = getLocal('users');
        users.unshift(res.admin);
        setLocal('users', users);
      }
      return res;
    }

    // Local fallback registration
    const comps = getLocal('companies');
    const newComp = {
      id: 'COMP' + String(comps.length + 1).padStart(3, '0'),
      ...payload.company,
      subscriptionStatus: 'active',
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0]
    };
    comps.unshift(newComp);
    setLocal('companies', comps);

    const users = getLocal('users');
    const newAdmin = {
      id: 'U' + String(users.length + 1).padStart(3, '0'),
      name: payload.admin.name,
      email: payload.admin.email,
      password: payload.admin.password,
      role: 'company_admin',
      companyId: newComp.id,
      phone: payload.admin.phone || '',
      avatar: payload.admin.name.substring(0, 2).toUpperCase(),
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0]
    };
    users.unshift(newAdmin);
    setLocal('users', users);

    return { company: newComp, admin: newAdmin };
  },

  async updateCompany(id, changes) {
    const res = await apiRequest(`companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes)
    });

    if (res && res.error && res.status !== 0) {
      return res;
    }

    const comps = getLocal('companies');
    const idx = comps.findIndex(c => c.id === id);
    if (idx > -1) {
      comps[idx] = { ...comps[idx], ...changes };
      setLocal('companies', comps);
    }
    return res && !res.error ? res : comps[idx];
  },

  async toggleOverage(id, payload) {
    const res = await apiRequest(`companies/${id}/overage`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });

    const comps = getLocal('companies');
    const idx = comps.findIndex(c => c.id === id);
    if (idx > -1) {
      comps[idx] = { ...comps[idx], ...payload };
      setLocal('companies', comps);
    }
    return res && !res.error ? res : comps[idx];
  },

  async getCompanySubscription(id) {
    const res = await apiRequest(`companies/${id}/subscription`);
    if (res && !res.error) return res;

    const c = getLocal('companies').find(item => item.id === id);
    if (!c) return null;

    const planLimits = {
      Basic: { userLimit: 10, projectLimit: 3, monthlyPrice: 4999 },
      Pro: { userLimit: 50, projectLimit: 15, monthlyPrice: 9999 },
      Enterprise: { userLimit: 500, projectLimit: 100, monthlyPrice: 19999 }
    };
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
      nextBillingDate: '2026-04-01'
    };
  },

  async getUsers(companyId) {
    const res = await apiRequest('users');
    if (Array.isArray(res)) {
      const local = getLocal('users');
      const merged = res.map(ru => {
        const existing = local.find(lu => lu.id === ru.id || lu.email?.toLowerCase() === ru.email?.toLowerCase());
        return existing?.password ? { ...ru, password: existing.password } : ru;
      });
      setLocal('users', merged);
      let list = merged;
      if (companyId) list = list.filter(u => u.companyId === companyId);
      return list;
    }
    let list = getLocal('users');
    if (companyId) list = list.filter(u => u.companyId === companyId);
    return list;
  },

  async createUser(data) {
    const res = await apiRequest('users', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (res && res.error && res.status !== 0) {
      return res;
    }

    const list = getLocal('users');
    const newRecord = res && !res.error ? res : { id: 'U' + Date.now().toString().slice(-4), ...data };
    list.unshift(newRecord);
    setLocal('users', list);
    return newRecord;
  },

  async updateUser(id, changes) {
    const res = await apiRequest(`users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes)
    });

    if (res && res.error && res.status !== 0) {
      return res;
    }

    const list = getLocal('users');
    const idx = list.findIndex(u => u.id === id);
    if (idx > -1) {
      list[idx] = { ...list[idx], ...(res && !res.error ? res : changes) };
      setLocal('users', list);
    }
    return res && !res.error ? res : (idx > -1 ? list[idx] : null);
  },

  async deleteUser(id) {
    const res = await apiRequest(`users/${id}`, { method: 'DELETE' });
    let list = getLocal('users').filter(u => u.id !== id);
    setLocal('users', list);
    return true;
  },

  async getProjects(companyId) {
    const res = await apiRequest('projects');
    let list = Array.isArray(res) ? res : getLocal('projects');
    if (Array.isArray(res)) setLocal('projects', res);

    // Normalize any newly added projects with 0 spent and legacy auto-split into 100% in Others
    list = list.map(p => {
      const b = Number(p.budget) || 0;
      if (
        !['P001', 'P002', 'P003', 'P004'].includes(p.id) &&
        (Number(p.spent) === 0) &&
        p.allocations &&
        p.allocations.Materials === Math.round(b * 0.4) &&
        p.allocations.Labor === Math.round(b * 0.3)
      ) {
        return {
          ...p,
          allocations: { Materials: 0, Labor: 0, Equipment: 0, Other: b }
        };
      }
      return p;
    });

    // Keep project.spent dynamically synchronized with actual recorded expenses
    const allExpenses = getLocal('expenses');
    list = list.map(p => {
      const pExpenses = allExpenses.filter(e => e.projectId === p.id);
      if (pExpenses.length > 0) {
        const total = pExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return { ...p, spent: total };
      }
      return p;
    });

    if (companyId) list = list.filter(p => !p.companyId || p.companyId === companyId);
    const currentUser = this.getCurrentUser();
    if (currentUser?.role === 'finance_manager') {
      list = list.filter(p => p.financeManagerId === currentUser.id);
    }
    return list;
  },

  async getProjectById(id) {
    const res = await apiRequest(`projects/${id}`);
    let p = (res && !res.error) ? res : getLocal('projects').find(x => x.id === id) || null;
    if (p) {
      const pExpenses = getLocal('expenses').filter(e => e.projectId === p.id);
      if (pExpenses.length > 0) {
        p = { ...p, spent: pExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0) };
      }
    }
    return p;
  },

  async createProject(data) {
    const b = Number(data.budget) || 0;
    const enrichedData = {
      ...data,
      budget: b,
      spent: data.spent !== undefined ? Number(data.spent) : 0,
      progress: data.progress !== undefined ? Number(data.progress) : 0,
      teamSize: Number(data.teamSize) || 1,
      status: data.status || 'On Track',
      description: (data.description && data.description.trim()) || ('Project ' + (data.name || 'Scope')),
      allocations: (data.allocations && Object.keys(data.allocations).length > 0)
        ? data.allocations
        : {
            Materials: 0,
            Labor: 0,
            Equipment: 0,
            Other: b
          }
    };

    const res = await apiRequest('projects', {
      method: 'POST',
      body: JSON.stringify(enrichedData)
    });

    if (res && res.error && res.status !== 0) {
      return res;
    }

    const list = getLocal('projects');
    const newRecord = res && !res.error ? res : { id: 'P' + Date.now().toString().slice(-4), ...enrichedData };
    list.unshift(newRecord);
    setLocal('projects', list);
    return newRecord;
  },

  async updateProject(id, changes) {
    const res = await apiRequest(`projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes)
    });

    if (res && res.error && res.status !== 0) {
      return res;
    }

    const list = getLocal('projects');
    const idx = list.findIndex(p => p.id === id);
    if (idx > -1) {
      list[idx] = { ...list[idx], ...(res && !res.error ? res : changes) };
      setLocal('projects', list);
    }
    return res && !res.error ? res : (idx > -1 ? list[idx] : null);
  },

  async deleteProject(id) {
    const proj = getLocal('projects').find(p => p.id === id);
    await apiRequest(`projects/${id}`, { method: 'DELETE' });
    const list = getLocal('projects').filter(p => p.id !== id);
    setLocal('projects', list);
    if (proj && proj.clientId) {
      const remaining = list.filter(p => p.clientId === proj.clientId);
      if (remaining.length === 0) {
        const users = getLocal('users').filter(u => u.id !== proj.clientId);
        setLocal('users', users);
      }
    }
    return true;
  },

  // --- Tasks ---
  async getTasks(companyId) {
    const res = await apiRequest('tasks');
    let list = Array.isArray(res) ? res : getLocal('tasks');
    if (Array.isArray(res)) setLocal('tasks', res);
    if (companyId) list = list.filter(t => !t.companyId || t.companyId === companyId);
    return list;
  },

  async getTaskById(id) {
    const res = await apiRequest(`tasks/${id}`);
    if (res && !res.error) return res;
    return getLocal('tasks').find(t => t.id === id) || null;
  },

  async createTask(data) {
    const res = await apiRequest('tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    const list = getLocal('tasks');
    const newRecord = res && !res.error ? res : { id: 'T' + Date.now().toString().slice(-4), ...data };
    list.unshift(newRecord);
    setLocal('tasks', list);
    return newRecord;
  },

  async updateTask(id, changes) {
    const res = await apiRequest(`tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes)
    });

    const list = getLocal('tasks');
    const idx = list.findIndex(t => t.id === id);
    if (idx > -1) {
      list[idx] = { ...list[idx], ...changes };
      setLocal('tasks', list);
    }
    return res && !res.error ? res : list[idx];
  },

  async deleteTask(id) {
    await apiRequest(`tasks/${id}`, { method: 'DELETE' });
    const list = getLocal('tasks').filter(t => t.id !== id);
    setLocal('tasks', list);
    return true;
  },

  // --- Bills ---
  async getBills(companyId) {
    const res = await apiRequest('bills');
    let list = Array.isArray(res) ? res : getLocal('bills');
    if (Array.isArray(res)) setLocal('bills', res);
    if (companyId) list = list.filter(b => !b.companyId || b.companyId === companyId);
    const currentUser = this.getCurrentUser();
    if (currentUser?.role === 'finance_manager') {
      const projs = getLocal('projects').filter(p => p.financeManagerId === currentUser.id);
      const projIds = new Set(projs.map(p => p.id));
      list = list.filter(b => projIds.has(b.projectId));
    }
    return list;
  },

  async getBillById(id) {
    const res = await apiRequest(`bills/${id}`);
    if (res && !res.error) return res;
    return getLocal('bills').find(b => b.id === id) || null;
  },

  async createBill(data) {
    const res = await apiRequest('bills', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    const list = getLocal('bills');
    const newRecord = res && !res.error ? res : { id: 'B' + Date.now().toString().slice(-4), ...data };
    list.unshift(newRecord);
    setLocal('bills', list);
    return newRecord;
  },

  async updateBill(id, changes) {
    const res = await apiRequest(`bills/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes)
    });

    const list = getLocal('bills');
    const idx = list.findIndex(b => b.id === id);
    if (idx > -1) {
      list[idx] = { ...list[idx], ...changes };
      setLocal('bills', list);
    }
    return res && !res.error ? res : list[idx];
  },

  async deleteBill(id) {
    await apiRequest(`bills/${id}`, { method: 'DELETE' });
    const list = getLocal('bills').filter(b => b.id !== id);
    setLocal('bills', list);
    return true;
  },

  // --- Expenses ---
  async recalculateProjectSpent(projectId) {
    if (!projectId) return 0;
    const exps = getLocal('expenses').filter((x) => x.projectId === projectId);
    const total = exps.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const projs = getLocal('projects');
    const idx = projs.findIndex((p) => p.id === projectId);
    if (idx > -1) {
      projs[idx].spent = total;
      setLocal('projects', projs);
    }
    try {
      await apiRequest(`projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ spent: total })
      });
    } catch (e) {}
    return total;
  },

  async getExpenses(companyId) {
    const res = await apiRequest('expenses');
    let list = Array.isArray(res) ? res : getLocal('expenses');
    if (Array.isArray(res)) setLocal('expenses', res);
    if (companyId) list = list.filter(e => !e.companyId || e.companyId === companyId);
    const currentUser = this.getCurrentUser();
    if (currentUser?.role === 'finance_manager') {
      const projs = getLocal('projects').filter(p => p.financeManagerId === currentUser.id);
      const projIds = new Set(projs.map(p => p.id));
      list = list.filter(e => projIds.has(e.projectId));
    }
    return list;
  },

  async createExpense(data) {
    const payload = {
      recordedBy: this.getCurrentUser()?.id || 'U004',
      ...data
    };
    const res = await apiRequest('expenses', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const list = getLocal('expenses');
    const newRecord = res && !res.error ? res : { id: 'E' + Date.now().toString().slice(-4), ...payload };
    list.unshift(newRecord);
    setLocal('expenses', list);
    if (payload.projectId) {
      await this.recalculateProjectSpent(payload.projectId);
    }
    return newRecord;
  },

  async updateExpense(id, changes) {
    const list = getLocal('expenses');
    const old = list.find((e) => e.id === id);
    const res = await apiRequest(`expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes)
    });

    const idx = list.findIndex(e => e.id === id);
    if (idx > -1) {
      list[idx] = { ...list[idx], ...changes };
      setLocal('expenses', list);
    }
    const updated = res && !res.error ? res : list[idx];
    if (changes.projectId || old?.projectId) {
      await this.recalculateProjectSpent(changes.projectId || old?.projectId);
      if (old?.projectId && changes.projectId && old.projectId !== changes.projectId) {
        await this.recalculateProjectSpent(old.projectId);
      }
    }
    return updated;
  },

  async deleteExpense(id) {
    const list = getLocal('expenses');
    const target = list.find((e) => e.id === id);
    await apiRequest(`expenses/${id}`, { method: 'DELETE' });
    const filtered = list.filter(e => e.id !== id);
    setLocal('expenses', filtered);
    if (target?.projectId) {
      await this.recalculateProjectSpent(target.projectId);
    }
    return true;
  },

  // --- Reports ---
  async uploadReportPhotos(files) {
    const formData = new FormData();
    files.forEach((f) => formData.append('photos', f));
    const token = sessionStorage.getItem('ch_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE_URL}/reports/upload`, {
        method: 'POST',
        headers,
        body: formData
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

    // Fallback if offline
    return {
      count: files.length,
      photoUrls: files.map((f) => URL.createObjectURL(f)),
      files: files.map((f) => ({ originalName: f.name, size: f.size, mimetype: f.type }))
    };
  },

  async getReports(companyId) {
    const res = await apiRequest('reports');
    let list = Array.isArray(res) ? res : getLocal('reports');
    if (Array.isArray(res)) setLocal('reports', res);
    if (companyId) list = list.filter(r => !r.companyId || r.companyId === companyId);
    return list;
  },

  async getReportById(id) {
    const res = await apiRequest(`reports/${id}`);
    if (res && !res.error) return res;
    return getLocal('reports').find(r => r.id === id) || null;
  },

  async createReport(data) {
    const res = await apiRequest('reports', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    const list = getLocal('reports');
    const newRecord = res && !res.error ? res : { id: 'R' + Date.now().toString().slice(-4), ...data };
    list.unshift(newRecord);
    setLocal('reports', list);
    return newRecord;
  },

  async deleteReport(id) {
    await apiRequest(`reports/${id}`, { method: 'DELETE' });
    const list = getLocal('reports').filter(r => r.id !== id);
    setLocal('reports', list);
    return true;
  },

  // --- Messages ---
  async getMessages(companyId) {
    const res = await apiRequest('messages');
    let list = Array.isArray(res) ? res : getLocal('messages');
    if (Array.isArray(res)) setLocal('messages', res);
    if (companyId) list = list.filter(m => !m.companyId || m.companyId === companyId);
    return list;
  },

  async sendMessage(data) {
    const res = await apiRequest('messages', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    const list = getLocal('messages');
    const newRecord = res && !res.error ? res : { id: 'M' + Date.now().toString().slice(-4), ...data };
    list.push(newRecord);
    setLocal('messages', list);
    return newRecord;
  },

  // --- Notifications ---
  async getNotifications(userId) {
    const res = await apiRequest('notifications');
    let list = Array.isArray(res) ? res : getLocal('notifications');
    if (Array.isArray(res)) setLocal('notifications', res);
    if (userId) list = list.filter(n => n.userId === userId);
    return list;
  },

  async createNotification(data) {
    const res = await apiRequest('notifications', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    const list = getLocal('notifications');
    const newRecord = res && !res.error ? res : { id: 'N' + Date.now().toString().slice(-4), ...data };
    list.unshift(newRecord);
    setLocal('notifications', list);
    return newRecord;
  },

  async markNotificationRead(id) {
    await apiRequest(`notifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ read: true })
    }).catch(() => {});

    const list = getLocal('notifications');
    const idx = list.findIndex(n => n.id === id);
    if (idx > -1) {
      list[idx].read = true;
      setLocal('notifications', list);
    }
  },

  async deleteNotification(id) {
    await apiRequest(`notifications/${id}`, { method: 'DELETE' }).catch(() => {});
    const list = getLocal('notifications');
    setLocal('notifications', list.filter(n => n.id !== id));
  },

  async clearNotifications(userId) {
    await apiRequest('notifications/clear/all', { method: 'DELETE' }).catch(() => {});
    const list = getLocal('notifications');
    if (userId) {
      setLocal('notifications', list.filter(n => n.userId !== userId));
    } else {
      setLocal('notifications', []);
    }
  },

  // --- Inquiries ---
  async getInquiries() {
    const res = await apiRequest('inquiries');
    if (Array.isArray(res)) {
      setLocal('inquiries', res);
      return res;
    }
    return getLocal('inquiries');
  },

  async createInquiry(payload) {
    const res = await apiRequest('inquiries', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const list = getLocal('inquiries');
    const newRecord = res && !res.error ? res : { id: 'INQ' + Date.now().toString().slice(-4), status: 'Pending', createdAt: new Date().toISOString().split('T')[0], ...payload };
    list.unshift(newRecord);
    setLocal('inquiries', list);

    // Notify Superuser / Platform Admin
    await this.createNotification({
      userId: 'U000',
      type: 'inquiry',
      title: 'New Contact Inquiry',
      body: `Inquiry from ${payload.name} (${payload.company || 'Individual'}): ${payload.message}`,
      message: `Inquiry from ${payload.name} (${payload.company || 'Individual'}): ${payload.message}`,
      date: new Date().toISOString().split('T')[0],
      time: 'just now',
      read: false,
      details: payload
    });

    return newRecord;
  },

  async updateInquiry(id, changes) {
    const res = await apiRequest(`inquiries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes)
    });

    const list = getLocal('inquiries');
    const idx = list.findIndex(item => item.id === id);
    if (idx > -1) {
      list[idx] = { ...list[idx], ...changes };
      setLocal('inquiries', list);
    }
    return res && !res.error ? res : list[idx];
  }
};

// Auto initialize on load
initDB();