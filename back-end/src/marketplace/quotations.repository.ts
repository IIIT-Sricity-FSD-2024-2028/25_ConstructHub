import { Injectable } from '@nestjs/common';
import { attachStore } from '../utils/json-store';
import { nextSequentialId } from '../utils/ids';

export interface QuotationItem {
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number; // always computed on the server: quantity x rate
}

export type EstimationStatus = 'assigned' | 'pm_submitted' | 'fm_submitted' | 'submitted';

/** One payable stage of a quotation. internalCost and clientAmount are filled by the FM and the Company Admin. */
export interface QuotationStage {
  name: string;
  durationDays: number;
  materialScope: string;
  internalCost?: number; // FM only. Never sent to the client.
  clientAmount?: number; // internalCost + markup. Set when the Company Admin releases the quote.
}

export interface QuotationRecord {
  id: string;
  requirementId: string;
  companyId: string;
  companyName: string;
  submittedBy: string;
  items: QuotationItem[];
  totalAmount: number;
  durationDays: number;
  validUntil?: string; // YYYY-MM-DD
  notes?: string;
  // 'estimating' = PM / FM / Admin are still preparing it. The client cannot see it yet.
  status: 'estimating' | 'submitted' | 'accepted' | 'rejected' | 'withdrawn';
  statusReason?: string;
  // 3-role estimation. Quotations without estimationStatus are legacy single-screen quotes and count as released.
  estimationStatus?: EstimationStatus;
  assignedPmId?: string;
  assignedFmId?: string;
  internalBaseCost?: number; // FM total of stage costs = the site budget cap. Never sent to the client.
  markupPercent?: number; // Company Admin only. Never sent to the client.
  mobilizationAdvancePercent?: number; // FM proposes, shown to the client
  milestoneStages?: QuotationStage[];
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class QuotationsRepository {
  constructor() {
    attachStore<QuotationRecord[]>('quotations', this.memoryData, () => this.memoryData, (v) => {
      this.memoryData = v;
    });
  }

  private memoryData: QuotationRecord[] = [
    {
      id: 'QUO001',
      requirementId: 'REQ001',
      companyId: 'COMP001',
      companyName: 'Apex Builders',
      submittedBy: 'U001',
      items: [
        { description: 'Foundation, plinth and RCC structure', unit: 'stage', quantity: 1, rate: 2600000, amount: 2600000 },
        { description: 'Brickwork, plastering and waterproofing', unit: 'stage', quantity: 1, rate: 1400000, amount: 1400000 },
        { description: 'Electrical, plumbing and sanitary works', unit: 'stage', quantity: 1, rate: 1100000, amount: 1100000 },
        { description: 'Flooring, painting and finishing', unit: 'stage', quantity: 1, rate: 1300000, amount: 1300000 },
      ],
      totalAmount: 6400000,
      durationDays: 240,
      validUntil: '2027-12-31',
      notes: 'Includes materials and labour. 10% mobilization advance recovered across stage bills.',
      status: 'submitted',
      estimationStatus: 'submitted',
      assignedPmId: 'U002',
      assignedFmId: 'U004',
      internalBaseCost: 5120000,
      markupPercent: 25,
      mobilizationAdvancePercent: 10,
      milestoneStages: [
        { name: 'Foundation & RCC Structure', durationDays: 90, materialScope: 'Excavation, PCC, TMT steel, M25 concrete and formwork.', internalCost: 2080000, clientAmount: 2600000 },
        { name: 'Brickwork & Waterproofing', durationDays: 55, materialScope: 'AAC blocks, river sand, OPC cement and terrace waterproofing.', internalCost: 1120000, clientAmount: 1400000 },
        { name: 'MEP & Sanitary Works', durationDays: 45, materialScope: 'FR copper wiring, CPVC/UPVC plumbing, concealed fixtures and DBs.', internalCost: 880000, clientAmount: 1100000 },
        { name: 'Flooring & Finishing', durationDays: 50, materialScope: 'Vitrified tiles, putty, exterior/interior emulsions and doors.', internalCost: 1040000, clientAmount: 1300000 },
      ],
      createdAt: '2026-10-28',
      updatedAt: '2026-10-28',
    },
    {
      id: 'QUO002',
      requirementId: 'REQ001',
      companyId: 'COMP002',
      companyName: 'L&T Infrastructure',
      submittedBy: 'U006',
      items: [
        { description: 'Complete structure (foundation to terrace slab)', unit: 'stage', quantity: 1, rate: 3300000, amount: 3300000 },
        { description: 'Masonry, finishing and MEP works', unit: 'stage', quantity: 1, rate: 3500000, amount: 3500000 },
      ],
      totalAmount: 6800000,
      durationDays: 210,
      validUntil: '2027-12-31',
      notes: 'Premium-grade materials with 12-month defect liability and 10% mobilization advance.',
      status: 'submitted',
      estimationStatus: 'submitted',
      assignedPmId: 'U007',
      assignedFmId: 'U009',
      internalBaseCost: 5440000,
      markupPercent: 25,
      mobilizationAdvancePercent: 10,
      milestoneStages: [
        { name: 'Foundation & Structural Frame', durationDays: 105, materialScope: 'Earthwork, footing concrete, Fe500D steel and terrace slab.', internalCost: 2640000, clientAmount: 3300000 },
        { name: 'Masonry, MEP & Finishing', durationDays: 105, materialScope: 'Blockwork, plumbing, electrical conduits, tiling and paint.', internalCost: 2800000, clientAmount: 3500000 },
      ],
      createdAt: '2026-10-29',
      updatedAt: '2026-10-29',
    },
    {
      id: 'QUO003',
      requirementId: 'REQ002',
      companyId: 'COMP001',
      companyName: 'Apex Builders',
      submittedBy: 'U001',
      items: [
        { description: 'Structure (G+2 RCC frame)', unit: 'stage', quantity: 1, rate: 8550000, amount: 8550000 },
        { description: 'Finishing and fittings', unit: 'stage', quantity: 1, rate: 6750000, amount: 6750000 },
        { description: 'Lift shaft and landscaping', unit: 'stage', quantity: 1, rate: 1500000, amount: 1500000 },
      ],
      totalAmount: 16800000,
      durationDays: 365,
      validUntil: '2027-12-31',
      notes: '3-role staged estimate. 10% mobilization advance recovered proportionally across stage bills.',
      status: 'submitted',
      estimationStatus: 'submitted',
      assignedPmId: 'U002',
      assignedFmId: 'U004',
      internalBaseCost: 13440000,
      markupPercent: 25,
      mobilizationAdvancePercent: 10,
      milestoneStages: [
        { name: 'G+2 RCC Structure', durationDays: 165, materialScope: 'Excavation, footings, columns, beams and 3 RCC slabs for 6 apartments.', internalCost: 6840000, clientAmount: 8550000 },
        { name: 'Apartment Finishing & MEP', durationDays: 145, materialScope: 'Masonry, plaster, electrical, plumbing, tiling, woodwork and painting.', internalCost: 5400000, clientAmount: 6750000 },
        { name: 'Lift Shaft & Site Landscaping', durationDays: 55, materialScope: 'Passenger elevator shaft civil work, compound wall, paving and landscaping.', internalCost: 1200000, clientAmount: 1500000 },
      ],
      createdAt: '2026-10-30',
      updatedAt: '2026-10-30',
    },
    {
      id: 'QUO004',
      requirementId: 'REQ002',
      companyId: 'COMP002',
      companyName: 'L&T Infrastructure',
      submittedBy: 'U006',
      items: [
        { description: 'Foundation & G+2 RCC superstructure', unit: 'stage', quantity: 1, rate: 8700000, amount: 8700000 },
        { description: 'MEP, lift core & envelope works', unit: 'stage', quantity: 1, rate: 5220000, amount: 5220000 },
        { description: 'Turnkey interior finishing & handover', unit: 'stage', quantity: 1, rate: 3480000, amount: 3480000 },
      ],
      totalAmount: 17400000,
      durationDays: 330,
      validUntil: '2027-12-31',
      notes: 'Fixed price turnkey with milestone billing and 10% mobilization advance.',
      status: 'submitted',
      estimationStatus: 'submitted',
      assignedPmId: 'U007',
      assignedFmId: 'U009',
      internalBaseCost: 13920000,
      markupPercent: 25,
      mobilizationAdvancePercent: 10,
      milestoneStages: [
        { name: 'Foundation & G+2 Superstructure', durationDays: 150, materialScope: 'Deep footings, plinth beam, Fe500D steel and M30 RCC slabs.', internalCost: 6960000, clientAmount: 8700000 },
        { name: 'MEP, Lift Core & Envelope', durationDays: 105, materialScope: 'Blockwork, waterproofing, electrical risers, plumbing shafts and lift core.', internalCost: 4176000, clientAmount: 5220000 },
        { name: 'Interior Finishing & Handover', durationDays: 75, materialScope: 'Flooring, modular fixtures, doors, windows, external paint and testing.', internalCost: 2784000, clientAmount: 3480000 },
      ],
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    },
    {
      // The winning, staged quotation behind demo project P001: PM stages -> FM costs -> Admin markup 25%.
      id: 'QUO005',
      requirementId: 'REQ003',
      companyId: 'COMP001',
      companyName: 'Apex Builders',
      submittedBy: 'U001',
      items: [
        { description: 'Foundation', unit: 'stage', quantity: 1, rate: 5000000, amount: 5000000 },
        { description: 'Structure', unit: 'stage', quantity: 1, rate: 26250000, amount: 26250000 },
      ],
      totalAmount: 31250000,
      durationDays: 180,
      validUntil: '2026-01-31',
      notes: 'Includes materials and labour. 10% mobilization advance, recovered from the stage bills.',
      status: 'accepted',
      estimationStatus: 'submitted',
      assignedPmId: 'U002',
      assignedFmId: 'U004',
      internalBaseCost: 25000000,
      markupPercent: 25,
      mobilizationAdvancePercent: 10,
      milestoneStages: [
        { name: 'Foundation', durationDays: 73, materialScope: 'Excavation, footing and foundation concrete.', internalCost: 4000000, clientAmount: 5000000 },
        { name: 'Structure', durationDays: 107, materialScope: 'Steel framework and RCC structure.', internalCost: 21000000, clientAmount: 26250000 },
      ],
      createdAt: '2025-12-05',
      updatedAt: '2025-12-20',
    },
    {
      id: 'QUO006',
      requirementId: 'REQ003',
      companyId: 'COMP002',
      companyName: 'L&T Infrastructure',
      submittedBy: 'U006',
      items: [{ description: 'Turnkey construction, Apex Skyline Tower', unit: 'lump sum', quantity: 1, rate: 33000000, amount: 33000000 }],
      totalAmount: 33000000,
      durationDays: 200,
      validUntil: '2026-01-31',
      notes: 'Fixed price turnkey.',
      status: 'rejected',
      statusReason: 'Another company was selected.',
      createdAt: '2025-12-06',
      updatedAt: '2025-12-20',
    },
    {
      id: 'QUO007',
      requirementId: 'REQ004',
      companyId: 'COMP001',
      companyName: 'Apex Builders',
      submittedBy: 'U001',
      items: [
        { description: 'Electrical & plumbing rough-in', unit: 'stage', quantity: 1, rate: 25200000, amount: 25200000 },
        { description: 'Finishing', unit: 'stage', quantity: 1, rate: 25200000, amount: 25200000 },
      ],
      totalAmount: 50400000,
      durationDays: 150,
      validUntil: '2026-02-15',
      notes: '3-role staged estimate. 10% mobilization advance recovered proportionally across stage bills.',
      status: 'accepted',
      estimationStatus: 'submitted',
      assignedPmId: 'U002',
      assignedFmId: 'U004',
      internalBaseCost: 42000000,
      markupPercent: 20,
      mobilizationAdvancePercent: 10,
      milestoneStages: [
        { name: 'Electrical & plumbing rough-in', durationDays: 75, materialScope: 'Copper cabling, PVC conduits, UPVC plumbing pipes and switchgear.', internalCost: 21000000, clientAmount: 25200000 },
        { name: 'Finishing', durationDays: 75, materialScope: 'Vitrified tiles, toughened glass, gypsum boards and primer/paint.', internalCost: 21000000, clientAmount: 25200000 },
      ],
      createdAt: '2025-12-22',
      updatedAt: '2026-01-10',
    },
    {
      id: 'QUO008',
      requirementId: 'REQ005',
      companyId: 'COMP002',
      companyName: 'L&T Infrastructure',
      submittedBy: 'U006',
      items: [
        { description: 'Pier construction', unit: 'stage', quantity: 1, rate: 39000000, amount: 39000000 },
        { description: 'Superstructure', unit: 'stage', quantity: 1, rate: 39000000, amount: 39000000 },
      ],
      totalAmount: 78000000,
      durationDays: 240,
      validUntil: '2026-03-01',
      notes: '3-role staged estimate for elevated metro corridor. 10% mobilization advance.',
      status: 'accepted',
      estimationStatus: 'submitted',
      assignedPmId: 'U007',
      assignedFmId: 'U009',
      internalBaseCost: 65000000,
      markupPercent: 20,
      mobilizationAdvancePercent: 10,
      milestoneStages: [
        { name: 'Pier construction', durationDays: 120, materialScope: 'M40 grade concrete, Fe500D TMT reinforcement steel and bearings.', internalCost: 32500000, clientAmount: 39000000 },
        { name: 'Superstructure', durationDays: 120, materialScope: 'Precast segments, prestressing tendons, epoxy grout and expansion joints.', internalCost: 32500000, clientAmount: 39000000 },
      ],
      createdAt: '2026-01-10',
      updatedAt: '2026-01-25',
    },
    {
      id: 'QUO009',
      requirementId: 'REQ006',
      companyId: 'COMP002',
      companyName: 'L&T Infrastructure',
      submittedBy: 'U006',
      items: [
        { description: 'Site preparation', unit: 'stage', quantity: 1, rate: 11160000, amount: 11160000 },
        { description: 'Drainage works', unit: 'stage', quantity: 1, rate: 26040000, amount: 26040000 },
      ],
      totalAmount: 37200000,
      durationDays: 285,
      validUntil: '2026-03-15',
      notes: '3-role staged estimate for metro depot civil works. 10% mobilization advance.',
      status: 'accepted',
      estimationStatus: 'submitted',
      assignedPmId: 'U007',
      assignedFmId: 'U009',
      internalBaseCost: 31000000,
      markupPercent: 20,
      mobilizationAdvancePercent: 10,
      milestoneStages: [
        { name: 'Site preparation', durationDays: 85, materialScope: 'Earthwork machinery, granular sub-base, geotextile membrane and aggregates.', internalCost: 9300000, clientAmount: 11160000 },
        { name: 'Drainage works', durationDays: 200, materialScope: 'NP4 RCC pipes, sulphate-resistant cement, waterproofing and inspection chambers.', internalCost: 21700000, clientAmount: 26040000 },
      ],
      createdAt: '2026-01-18',
      updatedAt: '2026-02-05',
    },
  ];

  findAll(): QuotationRecord[] {
    return this.memoryData;
  }
  findById(id: string): QuotationRecord | undefined {
    return this.memoryData.find((q) => q.id === id);
  }
  findByRequirementId(requirementId: string): QuotationRecord[] {
    return this.memoryData.filter((q) => q.requirementId === requirementId);
  }
  findByCompanyId(companyId: string): QuotationRecord[] {
    return this.memoryData.filter((q) => q.companyId === companyId);
  }
  findByCompanyAndRequirement(companyId: string, requirementId: string): QuotationRecord | undefined {
    return this.memoryData.find((q) => q.companyId === companyId && q.requirementId === requirementId);
  }
  create(record: Omit<QuotationRecord, 'id'>): QuotationRecord {
    const created = { ...record, id: nextSequentialId('QUO', this.memoryData) } as QuotationRecord;
    this.memoryData.push(created);
    return created;
  }
  update(id: string, patch: Partial<QuotationRecord>): QuotationRecord | undefined {
    const i = this.memoryData.findIndex((q) => q.id === id);
    if (i === -1) return undefined;
    this.memoryData[i] = { ...this.memoryData[i], ...patch };
    return this.memoryData[i];
  }
}
