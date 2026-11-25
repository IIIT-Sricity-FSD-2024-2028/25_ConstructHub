import { Injectable } from '@nestjs/common';
import { attachStore } from '../utils/json-store';
import { nextSequentialId, today } from '../utils/ids';

// ───────────────────────── types ─────────────────────────

export interface SupplierRecord {
  id: string;
  companyId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  materials?: string; // what they typically supply (free text)
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface RequestItem {
  id: string; // I1, I2 ... (stable inside the request)
  description: string;
  unit: string;
  quantity: number;
  specification?: string;
}

export type RequestStatus = 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'ordered';

export interface MaterialRequestRecord {
  id: string;
  companyId: string;
  projectId: string;
  projectName: string;
  requestedBy: string;
  requestedByName: string;
  items: RequestItem[];
  neededBy?: string;
  priority: 'Low' | 'Medium' | 'High';
  notes?: string;
  status: RequestStatus;
  decisionBy?: string;
  decisionByName?: string;
  decisionAt?: string;
  decisionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PoItem {
  id: string; // L1, L2 ...
  requestItemId: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  receivedQuantity: number;
}

export type PoStatus = 'pending_approval' | 'approved' | 'rejected' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrderRecord {
  id: string;
  companyId: string;
  projectId: string;
  projectName: string;
  requestId: string;
  supplierId: string;
  supplierName: string;
  items: PoItem[];
  totalAmount: number;
  expectedDelivery?: string;
  notes?: string;
  status: PoStatus;
  requiresApproval: boolean;
  approvalReason?: string;
  createdBy: string;
  createdByName: string;
  decisionBy?: string;
  decisionByName?: string;
  decisionAt?: string;
  decisionNote?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceiptRecord {
  id: string;
  companyId: string;
  projectId: string;
  poId: string;
  supplierId: string;
  supplierName: string;
  deliveryNote?: string;
  milestoneId?: string; // milestone the delivered material is for
  milestoneName?: string;
  vendorInvoice?: { originalName: string; storedName: string; mimetype: string; size: number; uploadedAt: string };
  receivedDate: string;
  items: Array<{ poItemId: string; description: string; unit: string; receivedQuantity: number; remarks?: string }>;
  notes?: string;
  receivedBy: string;
  receivedByName: string;
  createdAt: string;
}

export interface StockBalanceRecord {
  id: string;
  companyId: string;
  projectId: string;
  materialKey: string;
  description: string;
  unit: string;
  quantity: number;
  updatedAt: string;
}

export interface StockTransactionRecord {
  id: string;
  companyId: string;
  projectId: string;
  stockId: string;
  description: string;
  unit: string;
  type: 'GRN' | 'ISSUE';
  quantity: number; // signed: + received, - issued
  balanceAfter: number;
  refId: string; // GRN001 / ISS001
  byId: string;
  byName: string;
  date: string; // ISO date-time
}

export interface MaterialIssueRecord {
  id: string;
  companyId: string;
  projectId: string;
  items: Array<{ stockId: string; description: string; unit: string; quantity: number; requestItemId?: string }>;
  issuedBy: string;
  issuedByName: string;
  issuedTo?: string;
  issuedToName?: string;
  taskId?: string;
  requestId?: string;
  notes?: string;
  date: string;
}

export interface ProcurementSettingsRecord {
  companyId: string;
  poApprovalLimit: number; // purchase orders above this amount need Finance Manager approval
  updatedAt: string;
}

export const DEFAULT_PO_APPROVAL_LIMIT = 100000;

/** Same material typed slightly differently ("Cement  OPC 53 ") must hit the same stock line. */
export const materialKey = (description: string, unit: string) =>
  `${description.trim().replace(/\s+/g, ' ').toLowerCase()}|${unit.trim().toLowerCase()}`;

// ───────────────────────── repositories ─────────────────────────

@Injectable()
export class SuppliersRepository {
  constructor() {
    attachStore<SupplierRecord[]>('suppliers', this.data, () => this.data, (v) => { this.data = v; });
  }
  private data: SupplierRecord[] = [
    { id: 'SUP001', companyId: 'COMP001', name: 'Shree Cement Traders', contactPerson: 'Ramesh Joshi', phone: '9822012345', email: 'sales@shreecement.example', gstin: '27ABCDE1234F1Z5', address: 'Hadapsar, Pune', materials: 'Cement, sand, aggregates', status: 'active', createdAt: '2026-01-15' },
    { id: 'SUP002', companyId: 'COMP001', name: 'Mahalaxmi Steel & Hardware', contactPerson: 'Anil Kulkarni', phone: '9822098765', email: 'orders@mahalaxmisteel.example', address: 'Bhosari, Pune', materials: 'TMT bars, steel plates, binding wire', status: 'active', createdAt: '2026-01-16' },
    { id: 'SUP003', companyId: 'COMP002', name: 'Bharat Steel Corporation', contactPerson: 'Mohan Das', phone: '9900011223', email: 'sales@bharatsteel.example', address: 'Peenya, Bangalore', materials: 'Structural steel, TMT bars', status: 'active', createdAt: '2026-01-20' },
    { id: 'SUP004', companyId: 'COMP002', name: 'Karnataka Aggregates', contactPerson: 'Lakshmi Rao', phone: '9900044556', address: 'Tumkur Road, Bangalore', materials: 'Aggregates, sand, ready-mix concrete', status: 'active', createdAt: '2026-01-21' },
  ];
  findAll() { return this.data; }
  findByCompanyId(c: string) { return this.data.filter((s) => s.companyId === c); }
  findById(id: string) { return this.data.find((s) => s.id === id); }
  create(r: Omit<SupplierRecord, 'id'>): SupplierRecord {
    const created = { ...r, id: nextSequentialId('SUP', this.data) } as SupplierRecord;
    this.data.push(created);
    return created;
  }
  update(id: string, patch: Partial<SupplierRecord>) {
    const i = this.data.findIndex((s) => s.id === id);
    if (i === -1) return undefined;
    this.data[i] = { ...this.data[i], ...patch };
    return this.data[i];
  }
  remove(id: string) {
    const i = this.data.findIndex((s) => s.id === id);
    if (i === -1) return false;
    this.data.splice(i, 1);
    return true;
  }
}

@Injectable()
export class MaterialRequestsRepository {
  constructor() {
    attachStore<MaterialRequestRecord[]>('material-requests', this.data, () => this.data, (v) => { this.data = v; });
  }
  private data: MaterialRequestRecord[] = [
    {
      id: 'MR001', companyId: 'COMP001', projectId: 'P001', projectName: 'Apex Skyline Tower',
      requestedBy: 'U003', requestedByName: 'Priya Sharma',
      items: [
        { id: 'I1', description: 'Cement OPC 53 grade', unit: 'bags', quantity: 200 },
        { id: 'I2', description: 'TMT bars 12mm', unit: 'kg', quantity: 1500, specification: 'Fe 500D' },
      ],
      neededBy: '2026-12-15', priority: 'High', notes: 'Needed for the next slab pour.',
      status: 'approved', decisionBy: 'U002', decisionByName: 'Rajesh Kumar', decisionAt: '2026-11-02', decisionNote: 'Approved as per BOQ.',
      createdAt: '2026-11-01', updatedAt: '2026-11-02',
    },
    {
      id: 'MR002', companyId: 'COMP001', projectId: 'P002', projectName: 'Apex Commercial Complex',
      requestedBy: 'U003', requestedByName: 'Priya Sharma',
      items: [{ id: 'I1', description: 'PVC electrical conduit 25mm', unit: 'm', quantity: 500 }],
      neededBy: '2026-12-20', priority: 'Medium',
      status: 'submitted', createdAt: '2026-11-05', updatedAt: '2026-11-05',
    },
    {
      id: 'MR003', companyId: 'COMP001', projectId: 'P001', projectName: 'Apex Skyline Tower',
      requestedBy: 'U003', requestedByName: 'Priya Sharma',
      items: [{ id: 'I1', description: 'Steel plates 10mm', unit: 'kg', quantity: 5000 }],
      neededBy: '2026-12-10', priority: 'Medium',
      status: 'ordered', decisionBy: 'U002', decisionByName: 'Rajesh Kumar', decisionAt: '2026-11-03', decisionNote: 'Approved.',
      createdAt: '2026-11-02', updatedAt: '2026-11-04',
    },
  ];
  findAll() { return this.data; }
  findByCompanyId(c: string) { return this.data.filter((r) => r.companyId === c); }
  findById(id: string) { return this.data.find((r) => r.id === id); }
  create(r: Omit<MaterialRequestRecord, 'id'>): MaterialRequestRecord {
    const created = { ...r, id: nextSequentialId('MR', this.data) } as MaterialRequestRecord;
    this.data.push(created);
    return created;
  }
  update(id: string, patch: Partial<MaterialRequestRecord>) {
    const i = this.data.findIndex((r) => r.id === id);
    if (i === -1) return undefined;
    this.data[i] = { ...this.data[i], ...patch };
    return this.data[i];
  }
}

@Injectable()
export class PurchaseOrdersRepository {
  constructor() {
    attachStore<PurchaseOrderRecord[]>('purchase-orders', this.data, () => this.data, (v) => { this.data = v; });
  }
  private data: PurchaseOrderRecord[] = [
    {
      id: 'PO001', companyId: 'COMP001', projectId: 'P001', projectName: 'Apex Skyline Tower', requestId: 'MR001',
      supplierId: 'SUP001', supplierName: 'Shree Cement Traders',
      items: [{ id: 'L1', requestItemId: 'I1', description: 'Cement OPC 53 grade', unit: 'bags', quantity: 200, rate: 380, amount: 76000, receivedQuantity: 120 }],
      totalAmount: 76000, expectedDelivery: '2026-11-20', status: 'partially_received', requiresApproval: false,
      createdBy: 'U012', createdByName: 'Sunil Nair', createdAt: '2026-11-03', updatedAt: '2026-11-08',
    },
    {
      id: 'PO002', companyId: 'COMP001', projectId: 'P001', projectName: 'Apex Skyline Tower', requestId: 'MR003',
      supplierId: 'SUP002', supplierName: 'Mahalaxmi Steel & Hardware',
      items: [{ id: 'L1', requestItemId: 'I1', description: 'Steel plates 10mm', unit: 'kg', quantity: 5000, rate: 68, amount: 340000, receivedQuantity: 0 }],
      totalAmount: 340000, expectedDelivery: '2026-12-05', status: 'pending_approval', requiresApproval: true,
      approvalReason: 'Above the company approval limit (₹1,00,000)',
      createdBy: 'U012', createdByName: 'Sunil Nair', createdAt: '2026-11-04', updatedAt: '2026-11-04',
    },
  ];
  findAll() { return this.data; }
  findByCompanyId(c: string) { return this.data.filter((p) => p.companyId === c); }
  findById(id: string) { return this.data.find((p) => p.id === id); }
  findByRequestId(requestId: string) { return this.data.filter((p) => p.requestId === requestId); }
  findBySupplierId(supplierId: string) { return this.data.filter((p) => p.supplierId === supplierId); }
  create(r: Omit<PurchaseOrderRecord, 'id'>): PurchaseOrderRecord {
    const created = { ...r, id: nextSequentialId('PO', this.data) } as PurchaseOrderRecord;
    this.data.push(created);
    return created;
  }
  update(id: string, patch: Partial<PurchaseOrderRecord>) {
    const i = this.data.findIndex((p) => p.id === id);
    if (i === -1) return undefined;
    this.data[i] = { ...this.data[i], ...patch };
    return this.data[i];
  }
}

@Injectable()
export class GoodsReceiptsRepository {
  constructor() {
    attachStore<GoodsReceiptRecord[]>('goods-receipts', this.data, () => this.data, (v) => { this.data = v; });
  }
  private data: GoodsReceiptRecord[] = [
    {
      id: 'GRN001', companyId: 'COMP001', projectId: 'P001', poId: 'PO001', supplierId: 'SUP001', supplierName: 'Shree Cement Traders',
      deliveryNote: 'DC-4471', receivedDate: '2026-11-08',
      items: [{ poItemId: 'L1', description: 'Cement OPC 53 grade', unit: 'bags', receivedQuantity: 120 }],
      notes: 'First truck, remaining bags to follow.', receivedBy: 'U012', receivedByName: 'Sunil Nair', createdAt: '2026-11-08',
    },
  ];
  findAll() { return this.data; }
  findByCompanyId(c: string) { return this.data.filter((g) => g.companyId === c); }
  findByPoId(poId: string) { return this.data.filter((g) => g.poId === poId); }
  nextId() { return nextSequentialId('GRN', this.data); }
  findById(id: string) { return this.data.find((g) => g.id === id); }
  update(id: string, patch: Partial<GoodsReceiptRecord>) {
    const i = this.data.findIndex((g) => g.id === id);
    if (i === -1) return undefined;
    this.data[i] = { ...this.data[i], ...patch };
    return this.data[i];
  }
  create(r: GoodsReceiptRecord) { this.data.push(r); return r; }
}

@Injectable()
export class StockRepository {
  constructor() {
    attachStore<StockBalanceRecord[]>('stock-balances', this.balances, () => this.balances, (v) => { this.balances = v; });
    attachStore<StockTransactionRecord[]>('stock-transactions', this.ledger, () => this.ledger, (v) => { this.ledger = v; });
    attachStore<MaterialIssueRecord[]>('material-issues', this.issues, () => this.issues, (v) => { this.issues = v; });
  }
  private balances: StockBalanceRecord[] = [
    { id: 'STK001', companyId: 'COMP001', projectId: 'P001', materialKey: materialKey('Cement OPC 53 grade', 'bags'), description: 'Cement OPC 53 grade', unit: 'bags', quantity: 100, updatedAt: '2026-11-09' },
  ];
  private ledger: StockTransactionRecord[] = [
    { id: 'TX001', companyId: 'COMP001', projectId: 'P001', stockId: 'STK001', description: 'Cement OPC 53 grade', unit: 'bags', type: 'GRN', quantity: 120, balanceAfter: 120, refId: 'GRN001', byId: 'U012', byName: 'Sunil Nair', date: '2026-11-08T10:00:00.000Z' },
    { id: 'TX002', companyId: 'COMP001', projectId: 'P001', stockId: 'STK001', description: 'Cement OPC 53 grade', unit: 'bags', type: 'ISSUE', quantity: -20, balanceAfter: 100, refId: 'ISS001', byId: 'U012', byName: 'Sunil Nair', date: '2026-11-09T08:30:00.000Z' },
  ];
  private issues: MaterialIssueRecord[] = [
    {
      id: 'ISS001', companyId: 'COMP001', projectId: 'P001',
      items: [{ stockId: 'STK001', description: 'Cement OPC 53 grade', unit: 'bags', quantity: 20 }],
      issuedBy: 'U012', issuedByName: 'Sunil Nair', issuedTo: 'U003', issuedToName: 'Priya Sharma', taskId: 'T001',
      notes: 'Footing concrete', date: '2026-11-09',
    },
  ];

  allBalances() { return this.balances; }
  balancesFor(companyId: string) { return this.balances.filter((b) => b.companyId === companyId); }
  balanceById(id: string) { return this.balances.find((b) => b.id === id); }
  findBalance(projectId: string, key: string) { return this.balances.find((b) => b.projectId === projectId && b.materialKey === key); }
  createBalance(r: Omit<StockBalanceRecord, 'id'>) {
    const created = { ...r, id: nextSequentialId('STK', this.balances) } as StockBalanceRecord;
    this.balances.push(created);
    return created;
  }
  updateBalance(id: string, patch: Partial<StockBalanceRecord>) {
    const i = this.balances.findIndex((b) => b.id === id);
    if (i === -1) return undefined;
    this.balances[i] = { ...this.balances[i], ...patch };
    return this.balances[i];
  }

  ledgerFor(companyId: string) { return this.ledger.filter((t) => t.companyId === companyId); }
  addTransaction(r: Omit<StockTransactionRecord, 'id'>) {
    const created = { ...r, id: nextSequentialId('TX', this.ledger) } as StockTransactionRecord;
    this.ledger.push(created);
    return created;
  }

  issuesFor(companyId: string) { return this.issues.filter((i) => i.companyId === companyId); }
  issuesForRequest(requestId: string) { return this.issues.filter((i) => i.requestId === requestId); }
  nextIssueId() { return nextSequentialId('ISS', this.issues); }
  addIssue(r: MaterialIssueRecord) { this.issues.push(r); return r; }
}

@Injectable()
export class ProcurementSettingsRepository {
  constructor() {
    attachStore<ProcurementSettingsRecord[]>('procurement-settings', this.data, () => this.data, (v) => { this.data = v; });
  }
  private data: ProcurementSettingsRecord[] = [];
  get(companyId: string): ProcurementSettingsRecord {
    return this.data.find((s) => s.companyId === companyId) || { companyId, poApprovalLimit: DEFAULT_PO_APPROVAL_LIMIT, updatedAt: '' };
  }
  save(companyId: string, poApprovalLimit: number) {
    const i = this.data.findIndex((s) => s.companyId === companyId);
    const rec = { companyId, poApprovalLimit, updatedAt: today() };
    if (i === -1) this.data.push(rec); else this.data[i] = rec;
    return rec;
  }
}
