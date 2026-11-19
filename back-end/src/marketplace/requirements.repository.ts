import { Injectable } from '@nestjs/common';
import { attachStore } from '../utils/json-store';
import { nextSequentialId } from '../utils/ids';

export interface RequirementDocument {
  id: string;
  originalName: string;
  storedName: string; // file name on disk (never exposed as a public URL)
  mimetype: string;
  size: number;
  uploadedAt: string;
}

export interface RequirementRecord {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  title: string;
  description: string;
  location: string;
  projectType: string;
  budgetMin: number;
  budgetMax: number;
  expectedDurationDays?: number;
  quotationDeadline?: string; // YYYY-MM-DD
  preferredStartDate?: string;
  status: 'open' | 'awarded' | 'closed';
  documents: RequirementDocument[];
  awardedQuotationId?: string;
  awardedCompanyId?: string;
  contractId?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class RequirementsRepository {
  constructor() {
    attachStore<RequirementRecord[]>('requirements', this.memoryData, () => this.memoryData, (v) => {
      this.memoryData = v;
    });
  }

  private memoryData: RequirementRecord[] = [
    {
      id: 'REQ001',
      clientId: 'U005',
      clientName: 'Vikram Patel',
      clientEmail: 'client@apex.com',
      clientPhone: '+91 98765 43213',
      title: '3BHK independent villa construction',
      description:
        'Construction of a G+1 independent villa (approx. 2,400 sq ft built-up) on an owned 3,000 sq ft plot. Includes RCC structure, brickwork, plastering, electrical, plumbing, flooring and painting. Architectural drawings are ready.',
      location: 'Pune, Maharashtra',
      projectType: 'Residential',
      budgetMin: 5500000,
      budgetMax: 7500000,
      expectedDurationDays: 240,
      quotationDeadline: '2027-12-31',
      preferredStartDate: '2027-01-15',
      status: 'open',
      documents: [],
      createdAt: '2026-10-20',
      updatedAt: '2026-10-20',
    },
    {
      id: 'REQ002',
      clientId: 'U010',
      clientName: 'Anand Mahindra',
      clientEmail: 'client@ltinfra.com',
      clientPhone: '+91 98765 88814',
      title: 'G+2 residential building (6 apartments)',
      description:
        'New G+2 residential building with 6 two-bedroom apartments on a 4,500 sq ft plot. Looking for turnkey construction including structure, finishing, lift shaft and basic landscaping.',
      location: 'Bangalore, Karnataka',
      projectType: 'Residential',
      budgetMin: 14000000,
      budgetMax: 19000000,
      expectedDurationDays: 365,
      quotationDeadline: '2027-12-31',
      preferredStartDate: '2027-02-01',
      status: 'open',
      documents: [],
      createdAt: '2026-10-25',
      updatedAt: '2026-10-25',
    },
    {
      // Already awarded: this is the requirement behind demo project P001 (see QUO005 and contract CON001).
      id: 'REQ003',
      clientId: 'U005',
      clientName: 'Vikram Patel',
      clientEmail: 'client@apex.com',
      clientPhone: '+91 98765 43213',
      title: 'Apex Skyline Tower',
      description: 'High-rise luxury residential tower in South Mumbai. RCC structure with foundation, steel framework, finishing and services. Architectural drawings ready.',
      location: 'Mumbai, Maharashtra',
      projectType: 'Residential',
      budgetMin: 28000000,
      budgetMax: 34000000,
      expectedDurationDays: 180,
      quotationDeadline: '2025-12-15',
      preferredStartDate: '2026-01-01',
      status: 'awarded',
      documents: [],
      awardedQuotationId: 'QUO005',
      awardedCompanyId: 'COMP001',
      contractId: 'CON001',
      projectId: 'P001',
      createdAt: '2025-11-20',
      updatedAt: '2025-12-20',
    },
    {
      id: 'REQ004',
      clientId: 'U011',
      clientName: 'Suresh Shah',
      clientEmail: 'client2@apex.com',
      clientPhone: '+91 98765 43219',
      title: 'Apex Commercial Complex',
      description: 'Modern IT and retail commercial complex in Pune with MEP rough-in and commercial interior finishing.',
      location: 'Pune, Maharashtra',
      projectType: 'Commercial',
      budgetMin: 45000000,
      budgetMax: 55000000,
      expectedDurationDays: 150,
      quotationDeadline: '2026-01-05',
      preferredStartDate: '2026-01-15',
      status: 'awarded',
      documents: [],
      awardedQuotationId: 'QUO007',
      awardedCompanyId: 'COMP001',
      contractId: 'CON002',
      projectId: 'P002',
      createdAt: '2025-12-15',
      updatedAt: '2026-01-10',
    },
    {
      id: 'REQ005',
      clientId: 'U010',
      clientName: 'Anand Mahindra',
      clientEmail: 'client@ltinfra.com',
      clientPhone: '+91 98765 88814',
      title: 'L&T Infrastructure Project',
      description: 'Urban rapid transit metro elevated corridor in Delhi NCR including pier construction and viaduct superstructure.',
      location: 'Delhi NCR',
      projectType: 'Infrastructure',
      budgetMin: 70000000,
      budgetMax: 85000000,
      expectedDurationDays: 240,
      quotationDeadline: '2026-01-20',
      preferredStartDate: '2026-02-01',
      status: 'awarded',
      documents: [],
      awardedQuotationId: 'QUO008',
      awardedCompanyId: 'COMP002',
      contractId: 'CON003',
      projectId: 'P003',
      createdAt: '2026-01-02',
      updatedAt: '2026-01-25',
    },
    {
      id: 'REQ006',
      clientId: 'U010',
      clientName: 'Anand Mahindra',
      clientEmail: 'client@ltinfra.com',
      clientPhone: '+91 98765 88814',
      title: 'L&T Metro Development',
      description: 'Eco-friendly tech park and metro depot civil infrastructure in Bangalore including site preparation and drainage works.',
      location: 'Bangalore, Karnataka',
      projectType: 'Infrastructure',
      budgetMin: 34000000,
      budgetMax: 42000000,
      expectedDurationDays: 285,
      quotationDeadline: '2026-02-01',
      preferredStartDate: '2026-02-15',
      status: 'awarded',
      documents: [],
      awardedQuotationId: 'QUO009',
      awardedCompanyId: 'COMP002',
      contractId: 'CON004',
      projectId: 'P004',
      createdAt: '2026-01-12',
      updatedAt: '2026-02-05',
    },
  ];

  findAll(): RequirementRecord[] {
    return this.memoryData;
  }
  findById(id: string): RequirementRecord | undefined {
    return this.memoryData.find((r) => r.id === id);
  }
  findByClientId(clientId: string): RequirementRecord[] {
    return this.memoryData.filter((r) => r.clientId === clientId);
  }
  create(record: Omit<RequirementRecord, 'id'>): RequirementRecord {
    const created = { ...record, id: nextSequentialId('REQ', this.memoryData) } as RequirementRecord;
    this.memoryData.push(created);
    return created;
  }
  update(id: string, patch: Partial<RequirementRecord>): RequirementRecord | undefined {
    const i = this.memoryData.findIndex((r) => r.id === id);
    if (i === -1) return undefined;
    this.memoryData[i] = { ...this.memoryData[i], ...patch };
    return this.memoryData[i];
  }
}
