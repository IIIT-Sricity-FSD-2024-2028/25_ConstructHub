import { Injectable } from '@nestjs/common';
import { attachStore } from '../utils/json-store';
import { nextSequentialId } from '../utils/ids';

export type MilestoneStatus = 'Pending' | 'In Progress' | 'Ready for Review' | 'Completed';

export interface MilestoneRecord {
  id: string;
  companyId: string;
  projectId: string;
  name: string;
  description?: string;
  deadline: string; // YYYY-MM-DD
  weight: number; // % of the whole project (all weights of a project add up to at most 100)
  status: MilestoneStatus; // derived from tasks; "Completed" only after PM approval
  progress: number; // 0-100, derived: average progress of the milestone's tasks
  taskCount: number;
  completedTasks: number;
  /** Set when seeded from an awarded quotation (see MarketplaceService.acceptQuotation). */
  stageIndex?: number;
  durationDays?: number;
  materialScope?: string;
  internalBudget?: number; // FM's internal site cost for this stage (never shown to the client)
  clientStageAmount?: number; // what the client pays for this stage (internalBudget + markup)
  approvedBy?: string;
  approvedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Demo tasks that belong to the seeded milestones (used to migrate older saved data). */
export const SEED_TASK_LINKS: Record<string, string> = {
  T001: 'MS001', T002: 'MS002', T003: 'MS003', T004: 'MS003',
  T005: 'MS005', T006: 'MS006', T007: 'MS007', T008: 'MS008',
};

@Injectable()
export class MilestonesRepository {
  constructor() {
    attachStore<MilestoneRecord[]>('milestones', this.memoryData, () => this.memoryData, (v) => {
      this.memoryData = v;
    });
  }

  private seed(id: string, companyId: string, projectId: string, name: string, deadline: string, weight: number, createdBy: string, extra: Partial<MilestoneRecord> = {}): MilestoneRecord {
    return {
      id, companyId, projectId, name, deadline, weight,
      status: 'Pending', progress: 0, taskCount: 0, completedTasks: 0,
      createdBy, createdAt: '2026-01-10', updatedAt: '2026-01-10', ...extra,
    };
  }

  private memoryData: MilestoneRecord[] = [
    // P001 stages come from the accepted quotation QUO005 (internal cost + 25% markup = quoted client stage amount).
    // Foundation is finished, approved on the strength of site report R001, and billed (B001) through the milestone-locked flow.
    this.seed('MS001', 'COMP001', 'P001', 'Foundation', '2026-03-15', 40, 'U002', {
      description: 'Excavation, footing and foundation concrete.', stageIndex: 0, durationDays: 73,
      materialScope: 'Excavation, footing and foundation concrete.', internalBudget: 4000000, clientStageAmount: 5000000,
      status: 'Completed', progress: 100, taskCount: 1, completedTasks: 1, approvedBy: 'U002', approvedAt: '2026-03-12T10:30:00.000Z',
    }),
    this.seed('MS002', 'COMP001', 'P001', 'Structure', '2026-06-30', 60, 'U002', {
      description: 'Steel framework and RCC structure.', stageIndex: 1, durationDays: 107,
      materialScope: 'Steel framework and RCC structure.', internalBudget: 21000000, clientStageAmount: 26250000,
    }),
    this.seed('MS003', 'COMP001', 'P002', 'Electrical & plumbing rough-in', '2026-04-10', 50, 'U002', {
      description: 'MEP rough-in, conduits, main water lines and floor wiring.', stageIndex: 0, durationDays: 75,
      materialScope: 'Copper cabling, PVC conduits, UPVC plumbing pipes and switchgear.', internalBudget: 21000000, clientStageAmount: 25200000,
    
      status: 'Completed', progress: 100, approvedBy: 'U002', approvedAt: '2026-03-08T11:00:00.000Z',
    }),
    this.seed('MS004', 'COMP001', 'P002', 'Finishing', '2026-06-01', 50, 'U002', {
      description: 'Flooring, glazing, false ceiling and commercial interior finishing.', stageIndex: 1, durationDays: 75,
      materialScope: 'Vitrified tiles, toughened glass, gypsum boards and primer/paint.', internalBudget: 21000000, clientStageAmount: 25200000,
    }),
    this.seed('MS005', 'COMP002', 'P003', 'Pier construction', '2026-05-30', 50, 'U007', {
      description: 'Pile foundation, pile caps and metro pier columns.', stageIndex: 0, durationDays: 120,
      materialScope: 'M40 grade concrete, Fe500D TMT reinforcement steel and bearings.', internalBudget: 32500000, clientStageAmount: 39000000,
    
      status: 'Completed', progress: 100, approvedBy: 'U007', approvedAt: '2026-02-27T10:00:00.000Z',
    }),
    this.seed('MS006', 'COMP002', 'P003', 'Superstructure', '2026-09-15', 50, 'U007', {
      description: 'Precast U-girder launching, deck slab and parapet walls.', stageIndex: 1, durationDays: 120,
      materialScope: 'Precast segments, prestressing tendons, epoxy grout and expansion joints.', internalBudget: 32500000, clientStageAmount: 39000000,
    }),
    this.seed('MS007', 'COMP002', 'P004', 'Site preparation', '2026-04-30', 30, 'U007', {
      description: 'Mass excavation, leveling, soil stabilization and boundary wall.', stageIndex: 0, durationDays: 85,
      materialScope: 'Earthwork machinery, granular sub-base, geotextile membrane and aggregates.', internalBudget: 9300000, clientStageAmount: 11160000,
    
      status: 'Completed', progress: 100, approvedBy: 'U007', approvedAt: '2026-02-26T09:30:00.000Z',
    }),
    this.seed('MS008', 'COMP002', 'P004', 'Drainage works', '2026-11-20', 70, 'U007', {
      description: 'Storm water RCC box culverts, underground utilities and retention basin.', stageIndex: 1, durationDays: 200,
      materialScope: 'NP4 RCC pipes, sulphate-resistant cement, waterproofing and inspection chambers.', internalBudget: 21700000, clientStageAmount: 26040000,
    }),
  ];

  findAll(): MilestoneRecord[] {
    return this.memoryData;
  }
  findById(id: string): MilestoneRecord | undefined {
    return this.memoryData.find((m) => m.id === id);
  }
  findByProjectId(projectId: string): MilestoneRecord[] {
    return this.memoryData.filter((m) => m.projectId === projectId);
  }
  findByCompanyId(companyId: string): MilestoneRecord[] {
    return this.memoryData.filter((m) => m.companyId === companyId);
  }
  create(record: Omit<MilestoneRecord, 'id'>): MilestoneRecord {
    const created = { ...record, id: nextSequentialId('MS', this.memoryData) } as MilestoneRecord;
    this.memoryData.push(created);
    return created;
  }
  update(id: string, patch: Partial<MilestoneRecord>): MilestoneRecord | undefined {
    const i = this.memoryData.findIndex((m) => m.id === id);
    if (i === -1) return undefined;
    this.memoryData[i] = { ...this.memoryData[i], ...patch };
    return this.memoryData[i];
  }
  remove(id: string): boolean {
    const i = this.memoryData.findIndex((m) => m.id === id);
    if (i === -1) return false;
    this.memoryData.splice(i, 1);
    return true;
  }
}
