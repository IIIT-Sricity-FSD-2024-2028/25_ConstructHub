// ConstructHub - Central Data Store
// All mock data is EMBEDDED inline - no fetch() required.
// Works when opened directly via file:// protocol.

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED = {
  users: [
    { id:"U001", name:"Super Admin",   email:"super@constructhub.com",  password:"123456", role:"superuser",       phone:"+91 98000 00001", avatar:"SA", status:"active",   createdAt:"2026-01-01" },
    { id:"U002", name:"Rajesh Kumar",  email:"rajesh@constructhub.com", password:"123456", role:"project_manager", phone:"+91 98765 43210", avatar:"RK", status:"active",   createdAt:"2026-01-05" },
    { id:"U003", name:"Priya Sharma",  email:"priya@constructhub.com",  password:"123456", role:"site_engineer",   phone:"+91 98765 43211", avatar:"PS", status:"active",   createdAt:"2026-01-06" },
    { id:"U004", name:"Amit Verma",    email:"amit@constructhub.com",   password:"123456", role:"finance_manager", phone:"+91 98765 43212", avatar:"AV", status:"active",   createdAt:"2026-01-07" },
    { id:"U005", name:"Vikram Patel",  email:"vikram@constructhub.com", password:"123456", role:"client",          phone:"+91 98765 43213", avatar:"VP", status:"active",   createdAt:"2026-01-10" },
    { id:"U006", name:"Amit Sharma",   email:"amits@constructhub.com",  password:"123456", role:"site_engineer",   phone:"+91 98765 43214", avatar:"AS", status:"active",   createdAt:"2026-01-12" },
    { id:"U007", name:"John Doe",      email:"john@example.com",        password:"123456", role:"client",          phone:"+91 98765 43215", avatar:"JD", status:"inactive", createdAt:"2026-01-15" },

    { id:"U008", name:"Sanjay Verma",  email:"sanjay@constructhub.com", password:"123456", role:"client",          phone:"+91 98765 88811", avatar:"SV", status:"active",   createdAt:"2026-02-10" },
    { id:"U009", name:"Priya Menon",   email:"priyam@constructhub.com", password:"123456", role:"client",          phone:"+91 98765 99922", avatar:"PM", status:"active",   createdAt:"2026-02-12" }
  ],
  projects: [
    { id:"P001", name:"Skyline Tower",         location:"Mumbai, Maharashtra",  clientId:"U005", clientName:"Vikram Patel", managerId:"U002", budget:25000000, spent:18750000, progress:75, status:"On Track", startDate:"2026-01-01", endDate:"2026-04-30", teamSize:24, allocations: {Materials:12000000, Labor:8000000, Equipment:3000000, Other:2000000}, description:"Residential high-rise construction project in South Mumbai." },
    { id:"P002", name:"Metro Plaza",           location:"Delhi NCR",            clientId:"U007", clientName:"John Doe",     managerId:"U002", budget:52000000, spent:31200000, progress:60, status:"On Track", startDate:"2026-01-15", endDate:"2026-06-15", teamSize:38, allocations: {Materials:25000000, Labor:15000000, Equipment:8000000, Other:4000000}, description:"Commercial complex with retail and office spaces." },
    { id:"P003", name:"Green Valley Residency",location:"Bangalore, Karnataka", clientId:"U008", clientName:"Sanjay Verma", managerId:"U002", budget:38000000, spent:17100000, progress:45, status:"At Risk",  startDate:"2026-02-01", endDate:"2026-07-20", teamSize:32, allocations: {Materials:18000000, Labor:12000000, Equipment:5000000, Other:3000000}, description:"Gated residential community with 200 units." },
    { id:"P004", name:"Tech Park Complex",     location:"Pune, Maharashtra",    clientId:"U009", clientName:"Priya Menon",     managerId:"U002", budget:85000000, spent:25500000, progress:30, status:"On Track", startDate:"2026-02-15", endDate:"2026-09-10", teamSize:52, allocations: {Materials:45000000, Labor:20000000, Equipment:12000000, Other:8000000}, description:"IT park with multiple buildings and amenities." }
  ],
  tasks: [
    { id:"T001", title:"Foundation Concrete Pouring",  projectId:"P001", projectName:"Skyline Tower",          assignedTo:"U003", assignedName:"Priya Sharma", priority:"High",   status:"In Progress", progress:75,  startDate:"2026-03-01", deadline:"2026-03-08", description:"Complete the foundation concrete pouring for blocks A and B. Ensure proper curing time is maintained.", remarks:"75% done. Block A complete, Block B in progress." },
    { id:"T002", title:"Steel Framework Installation",  projectId:"P001", projectName:"Skyline Tower",          assignedTo:"U003", assignedName:"Priya Sharma", priority:"Medium", status:"Pending",     progress:0,   startDate:"2026-03-10", deadline:"2026-03-20", description:"Install steel framework for floors 1-5.", remarks:"" },
    { id:"T003", title:"Electrical Wiring - Floor 2",   projectId:"P002", projectName:"Metro Plaza",            assignedTo:"U003", assignedName:"Priya Sharma", priority:"High",   status:"In Progress", progress:60,  startDate:"2026-03-05", deadline:"2026-03-12", description:"Complete electrical wiring for Floor 2 including main panels and junction boxes.", remarks:"60% done. Main panels installed." },
    { id:"T004", title:"Plumbing Installation",          projectId:"P003", projectName:"Green Valley Residency", assignedTo:"U003", assignedName:"Priya Sharma", priority:"Medium", status:"Completed",   progress:100, startDate:"2026-02-25", deadline:"2026-03-05", description:"Install plumbing lines for blocks C and D.", remarks:"Completed on time. All checks passed." },
    { id:"T005", title:"Foundation Inspection",          projectId:"P001", projectName:"Skyline Tower",          assignedTo:"U006", assignedName:"Amit Sharma",  priority:"High",   status:"In Progress", progress:60,  startDate:"2026-03-01", deadline:"2026-03-08", description:"Inspect foundation work quality and compliance.", remarks:"Inspection ongoing." },
    { id:"T006", title:"Budget Review Q1",               projectId:"P002", projectName:"Metro Plaza",            assignedTo:"U006", assignedName:"Amit Sharma",  priority:"Medium", status:"Pending",     progress:0,   startDate:"2026-03-10", deadline:"2026-03-15", description:"Review Q1 budget allocations and expenditures.", remarks:"" },
    { id:"T007", title:"Safety Audit",                   projectId:"P004", projectName:"Tech Park Complex",      assignedTo:"U006", assignedName:"Amit Sharma",  priority:"High",   status:"Completed",   progress:100, startDate:"2026-03-01", deadline:"2026-03-05", description:"Conduct safety audit across all active zones.", remarks:"All safety checks passed. No critical issues." },
    { id:"T008", title:"Roofing Work - Block A",         projectId:"P001", projectName:"Skyline Tower",          assignedTo:"U003", assignedName:"Priya Sharma", priority:"Low",    status:"Pending",     progress:0,   startDate:"2026-03-20", deadline:"2026-04-05", description:"Complete roofing for Block A.", remarks:"" }
  ],
  reports: [
    { id:"R001", title:"Foundation Inspection Report",       projectId:"P001", projectName:"Skyline Tower",          submittedBy:"U006", submittedName:"Amit Sharma",  date:"2026-03-06", progress:75,  status:"Completed",    workDone:"Completed foundation inspection for blocks A and B. All measurements verified.", issues:"Minor crack found in section A-3, marked for repair.", priority:"Medium", materials:[{name:"Cement",qty:50,unit:"bags"},{name:"Steel Rods",qty:200,unit:"kg"}], photos:8,  remarks:"Overall progress satisfactory." },
    { id:"R002", title:"Structural Work Progress - Day 45",  projectId:"P002", projectName:"Metro Plaza",            submittedBy:"U003", submittedName:"Priya Sharma", date:"2026-03-05", progress:60,  status:"In Progress",  workDone:"Steel framework installation on floors 3-5 completed.", issues:"Delay in material supply for floor 6.", priority:"High",   materials:[{name:"Steel Beams",qty:45,unit:"pieces"},{name:"Concrete",qty:30,unit:"cubic meters"}], photos:12, remarks:"Material supply issue needs resolution." },
    { id:"R003", title:"Electrical Installation Report",     projectId:"P003", projectName:"Green Valley Residency", submittedBy:"U006", submittedName:"Amit Sharma",  date:"2026-03-04", progress:85,  status:"Completed",    workDone:"Electrical wiring completed for all ground floor units.", issues:"", priority:"Low", materials:[{name:"Wire",qty:500,unit:"meters"},{name:"Junction Box",qty:20,unit:"pieces"}], photos:5, remarks:"No issues encountered." },
    { id:"R004", title:"Plumbing Installation - Phase 2",    projectId:"P001", projectName:"Skyline Tower",          submittedBy:"U003", submittedName:"Priya Sharma", date:"2026-03-03", progress:50,  status:"Under Review", workDone:"Phase 2 plumbing lines installed for floors 3-5.", issues:"Pressure test pending for floor 4.", priority:"Medium", materials:[{name:"PVC Pipes",qty:300,unit:"meters"},{name:"Fittings",qty:150,unit:"pieces"}], photos:6, remarks:"Pending pressure test." },
    { id:"R005", title:"Safety Audit Report",                projectId:"P002", projectName:"Metro Plaza",            submittedBy:"U006", submittedName:"Amit Sharma",  date:"2026-03-02", progress:100, status:"Completed",    workDone:"Full safety audit conducted. All workers briefed on protocols.", issues:"", priority:"High", materials:[], photos:15, remarks:"All clear. Excellent compliance." }
  ],
  bills: [
    { id:"BILL-2024-001", projectId:"P001", projectName:"Skyline Tower",          clientId:"U005", clientName:"Vikram Patel", amount:2500000, milestone:"Foundation Complete",    description:"Billing for completed foundation work including materials and labor.", generatedBy:"U004", status:"Approved", decisionDate:"2026-03-05", dueDate:"2026-03-11", rejectionReason:"" },
    { id:"BILL-2024-002", projectId:"P002", projectName:"Metro Plaza",            clientId:"U007", clientName:"John Doe",     amount:3750000, milestone:"Structure Phase 1",      description:"Billing for completed structural work phase 1.",                      generatedBy:"U004", status:"Pending",  decisionDate:"",           dueDate:"2026-03-12", rejectionReason:"" },
    { id:"BILL-2024-003", projectId:"P003", projectName:"Green Valley Residency", clientId:"U005", clientName:"Vikram Patel", amount:1800000, milestone:"Foundation & Site Prep", description:"Site preparation and foundation billing.",                            generatedBy:"U004", status:"Approved", decisionDate:"2026-03-02", dueDate:"2026-03-08", rejectionReason:"" },
    { id:"BILL-2024-004", projectId:"P004", projectName:"Tech Park Complex",      clientId:"U007", clientName:"John Doe",     amount:4200000, milestone:"Site Clearing",          description:"Site clearing and initial groundwork.",                               generatedBy:"U004", status:"Rejected", decisionDate:"2026-03-01", dueDate:"2026-03-07", rejectionReason:"Amount disputed. Requesting revised invoice." },
    { id:"BILL-2024-005", projectId:"P002", projectName:"Metro Plaza",            clientId:"U007", clientName:"John Doe",     amount:5600000, milestone:"Structure Phase 2",      description:"Billing for structure phase 2 completion.",                           generatedBy:"U004", status:"Pending",  decisionDate:"",           dueDate:"2026-03-18", rejectionReason:"" }
  ],
  expenses: [
    { id:"E001", projectId:"P001", projectName:"Skyline Tower",          category:"Materials", amount:850000, description:"Cement and steel for foundation", date:"2026-03-01", recordedBy:"U004", receipt:"receipt_001.pdf" },
    { id:"E002", projectId:"P002", projectName:"Metro Plaza",            category:"Labor",     amount:450000, description:"Weekly labor charges",           date:"2026-03-03", recordedBy:"U004", receipt:"" },
    { id:"E003", projectId:"P001", projectName:"Skyline Tower",          category:"Equipment", amount:220000, description:"Crane rental - 2 weeks",          date:"2026-03-05", recordedBy:"U004", receipt:"receipt_003.pdf" },
    { id:"E004", projectId:"P003", projectName:"Green Valley Residency", category:"Materials", amount:310000, description:"Bricks and sand",                 date:"2026-03-06", recordedBy:"U004", receipt:"" },
    { id:"E005", projectId:"P004", projectName:"Tech Park Complex",      category:"Other",     amount:75000,  description:"Site security charges",            date:"2026-03-07", recordedBy:"U004", receipt:"" }
  ],
  messages: [
    { id:"M001", from:"U002", fromName:"Rajesh Kumar", to:"U003", toName:"Priya Sharma",  text:"Please review the updated project timeline.", time:"10:30 AM", date:"2026-03-24" },
    { id:"M002", from:"U003", fromName:"Priya Sharma", to:"U002", toName:"Rajesh Kumar",  text:"Sure, I'll take a look at it right away.",    time:"10:32 AM", date:"2026-03-24" },
    { id:"M003", from:"U002", fromName:"Rajesh Kumar", to:"U003", toName:"Priya Sharma",  text:"Great! Let me know if you have any questions.", time:"10:35 AM", date:"2026-03-24" },
    { id:"M004", from:"U004", fromName:"Amit Verma",   to:"U002", toName:"Rajesh Kumar",  text:"Invoice #2401 approved and sent.",              time:"08:00 AM", date:"2026-03-24" }
  ],
  notifications: [
    { id:"N001", userId:"U002", type:"task",    title:"Task Completed",   body:"Foundation work for Skyline Tower has been completed",   time:"2 hours ago", read:false },
    { id:"N002", userId:"U002", type:"report",  title:"New Site Report",  body:"Daily progress report submitted for Metro Plaza",         time:"4 hours ago", read:false },
    { id:"N003", userId:"U002", type:"payment", title:"Payment Approved", body:"Invoice #2401 has been approved by client",              time:"1 day ago",   read:true  },
    { id:"N004", userId:"U003", type:"task",    title:"New Task Assigned",body:"Foundation Concrete Pouring assigned to you",            time:"1 day ago",   read:false },
    { id:"N005", userId:"U004", type:"bill",    title:"Bill Approved",    body:"BILL-2024-001 has been approved by Vikram Patel",        time:"2 days ago",  read:false },
    { id:"N006", userId:"U005", type:"bill",    title:"New Bill Pending", body:"Invoice for Skyline Tower requires your approval",       time:"3 hours ago", read:false }
  ]
};

// ─── Live DB (in-memory, synced to sessionStorage) ───────────────────────────
const DB = {};

function syncSeedUserPasswords() {
  if (!Array.isArray(DB.users)) return false;

  let changed = false;
  const seedPasswordById = {};
  SEED.users.forEach(user => {
    seedPasswordById[user.id] = user.password;
  });

  DB.users = DB.users.map(user => {
    const seedPassword = seedPasswordById[user.id];
    if (seedPassword && user.password !== seedPassword) {
      changed = true;
      return { ...user, password: seedPassword };
    }
    return user;
  });

  return changed;
}

// ─── Init: load from sessionStorage or use SEED ──────────────────────────────
function initDB() {
  const stored = sessionStorage.getItem('ch_db');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      Object.assign(DB, parsed);
      if (syncSeedUserPasswords()) saveDB();
      return;
    } catch(e) { /* fall through to seed */ }
  }
  // First visit — use seed data
  Object.assign(DB, JSON.parse(JSON.stringify(SEED))); // deep clone
  saveDB();
}

// Alias kept for compatibility
function initDBRoot() { initDB(); }
function loadDB() {
  const stored = sessionStorage.getItem('ch_db');
  if (stored) {
    try {
      Object.assign(DB, JSON.parse(stored));
      if (syncSeedUserPasswords()) saveDB();
      return true;
    }
    catch(e) {}
  }
  initDB();
  return false;
}

function saveDB() {
  try { sessionStorage.setItem('ch_db', JSON.stringify(DB)); }
  catch(e) { console.warn('sessionStorage unavailable'); }
}

function resetDB() {
  sessionStorage.removeItem('ch_db');
  Object.assign(DB, JSON.parse(JSON.stringify(SEED)));
  saveDB();
}

// ─── Generic CRUD ─────────────────────────────────────────────────────────────
function getAll(table) {
  loadDB();
  return Array.isArray(DB[table]) ? [...DB[table]] : [];
}

function getById(table, id) {
  loadDB();
  return (DB[table] || []).find(r => r.id === id) || null;
}

function create(table, record) {
  loadDB();
  if (!Array.isArray(DB[table])) DB[table] = [];
  DB[table].unshift(record);
  saveDB();
  return record;
}

function update(table, id, changes) {
  loadDB();
  const idx = (DB[table] || []).findIndex(r => r.id === id);
  if (idx === -1) return null;
  DB[table][idx] = { ...DB[table][idx], ...changes };
  saveDB();
  return DB[table][idx];
}

function remove(table, id) {
  loadDB();
  const before = (DB[table] || []).length;
  DB[table] = (DB[table] || []).filter(r => r.id !== id);
  saveDB();
  return (DB[table] || []).length < before;
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
  const path = window.location.pathname;
  if (path.includes('/pages/')) return '../../';
  return '';
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
  loadDB();
  return (DB.notifications || []).filter(n => n.userId === userId && !n.read).length;
}

function getUserNotifications(userId) {
  loadDB();
  return (DB.notifications || []).filter(n => n.userId === userId);
}

// ─── Auto-init on every page load ─────────────────────────────────────────────
initDB();
