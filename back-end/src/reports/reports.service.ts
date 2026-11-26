import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { MilestonesRepository } from '../milestones/milestones.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { StockRepository, materialKey } from '../procurement/procurement.repositories';
import { UserContext } from '../auth/current-user.decorator';
import { randomUUID } from 'crypto';

export const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Rainy', 'Stormy', 'Hot', 'Cold', 'Foggy'];
const round3 = (n: number) => Math.round(n * 1000) / 1000;

@Injectable()
export class ReportsService {
  constructor(
    private readonly repo: ReportsRepository,
    private readonly projects: ProjectsRepository,
    private readonly milestones: MilestonesRepository,
    private readonly tasks: TasksRepository,
    private readonly stock: StockRepository,
  ) {}

  findAll() { return this.repo.findAll(); }

  findByCompanyId(companyId: string) { return this.repo.findByCompanyId(companyId); }

  findOne(id: string) {
    const record = this.repo.findById(id);
    if (!record) throw new NotFoundException('Reports record not found.');
    return record;
  }

  /**
   * Material issued to this engineer on this project, minus what earlier reports already claimed as used.
   * A site report may only declare material that Site Stock really issued to the engineer.
   */
  stockAvailable(user: UserContext, projectId: string, excludeReportId?: string) {
    const project = this.projects.findById(projectId);
    if (!project || project.companyId !== user.companyId) throw new NotFoundException('Project not found.');
    const issued = new Map<string, { description: string; unit: string; issued: number }>();
    for (const issue of this.stock.issuesFor(user.companyId)) {
      if (issue.projectId !== projectId || issue.issuedTo !== user.userId) continue;
      for (const it of issue.items) {
        const key = materialKey(it.description, it.unit);
        const cur = issued.get(key) || { description: it.description, unit: it.unit, issued: 0 };
        cur.issued = round3(cur.issued + it.quantity);
        issued.set(key, cur);
      }
    }
    const used = new Map<string, number>();
    for (const r of this.repo.findAll()) {
      if (r.projectId !== projectId || r.submittedBy !== user.userId || r.id === excludeReportId) continue;
      for (const m of r.materials || []) {
        const key = materialKey(String(m.name), String(m.unit));
        used.set(key, round3((used.get(key) || 0) + (Number(m.qty) || 0)));
      }
    }
    return [...issued.entries()].map(([key, v]) => ({
      description: v.description, unit: v.unit, issued: v.issued, alreadyReported: used.get(key) || 0,
      available: round3(Math.max(0, v.issued - (used.get(key) || 0))),
    }));
  }

  /** An engineer can only report material as used if it was issued to them from Site Stock and not reported yet. */
  private assertMaterialsFromIssuedStock(data: any, project: any, user?: UserContext, excludeReportId?: string) {
    if (user?.role !== 'site_engineer') return;
    const availList = this.stockAvailable(user, project.id, excludeReportId);
    // If no issued stock is available for this engineer on this project, allow free-text material entries.
    if (!availList.some((a) => a.available > 0)) return;
    const avail = new Map(availList.map((a) => [materialKey(a.description, a.unit), a]));
    for (const m of data.materials || []) {
      const a = avail.get(materialKey(String(m.name), String(m.unit)));
      if (!a) throw new BadRequestException(`"${m.name}" (${m.unit}) was not issued to you from Site Stock, so it cannot be reported as used.`);
      if (Number(m.qty) > a.available) {
        throw new BadRequestException(`"${m.name}": you reported ${m.qty} ${m.unit} but only ${a.available} ${a.unit} of the stock issued to you is still unreported.`);
      }
    }
  }

  /** Milestone-linked reports: the server owns the link, the progress figure and the stock numbers. */
  private linkToMilestone(data: any, project: any, user?: UserContext, excludeReportId?: string) {
    if (project.status === 'Awaiting Advance') {
      throw new BadRequestException('Site reports are locked until the client pays the mobilization advance (Bill #1).');
    }
    if (!data.milestoneId) throw new BadRequestException('Select the milestone this report belongs to.');
    const ms = this.milestones.findById(data.milestoneId);
    if (!ms || ms.projectId !== project.id) throw new BadRequestException('That milestone does not belong to this project.');
    if (ms.status === 'Completed') throw new ConflictException('This milestone is already approved. Reopen it before adding reports.');

    let task: any = null;
    if (data.taskId) {
      task = this.tasks.findById(data.taskId);
      if (!task || task.projectId !== project.id || task.milestoneId !== ms.id) {
        throw new BadRequestException('That task does not belong to the selected milestone.');
      }
    }
    if (!WEATHER_OPTIONS.includes(String(data.weather))) {
      throw new BadRequestException(`Select the site weather (${WEATHER_OPTIONS.join(', ')}).`);
    }
    if (!Number.isInteger(data.laborCount) || data.laborCount < 0) {
      throw new BadRequestException('Enter the number of workers on site (0 or more).');
    }

    this.assertMaterialsFromIssuedStock(data, project, user, excludeReportId);
    return {
      milestoneId: ms.id, milestoneName: ms.name,
      taskId: task ? task.id : undefined, taskTitle: task ? task.title : undefined,
      // progress is never typed in: it is the current progress of the linked task / milestone
      progress: task ? Number(task.progress) || 0 : ms.progress,
    };
  }

  create(data: any, user?: UserContext) {
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');
    const project = this.projects.findById(data.projectId);
    if (!project || (user && user.role !== 'superuser' && project.companyId !== user.companyId)) {
      throw new NotFoundException('Project not found.');
    }
    // A report is always filed under the name of the person who submits it.
    if (user && user.role !== 'superuser') data = { ...data, submittedBy: user.userId };
    if (user?.role === 'site_engineer') {
      // Allowed while the engineer has unfinished work here, or to file the proof for a milestone whose tasks they
      // finished and which is still waiting for the PM's approval (otherwise the milestone could never be approved).
      const mine = this.tasks.findAll().filter((t) => t.projectId === project.id && t.assignedTo === user.userId);
      const hasOpen = mine.some((t) => t.status !== 'Completed');
      const awaitingProof = new Set(mine
        .filter((t) => t.status === 'Completed' && t.milestoneId && this.milestones.findById(t.milestoneId)?.status !== 'Completed')
        .map((t) => t.milestoneId));
      if (!hasOpen && !(data.milestoneId && awaitingProof.has(data.milestoneId))) {
        throw new ForbiddenException(awaitingProof.size > 0
          ? 'Your tasks on this project are finished: you can only report on the milestone they belong to while it waits for approval.'
          : 'You can only submit site reports for a project where you have an unfinished task assigned to you.');
      }
      if (data.taskId) {
        const t = this.tasks.findById(data.taskId);
        if (!t || t.assignedTo !== user.userId) throw new ForbiddenException('You can only report on tasks assigned to you.');
      }
    }
    let link = {};
    if (project.progressMode === 'milestones') {
      link = this.linkToMilestone(data, project, user);
    } else {
      this.assertMaterialsFromIssuedStock(data, project, user);
    }
    const record = { ...data, ...link, id: data.id || randomUUID() };
    return this.repo.create(record);
  }

  /** A report linked to an approved milestone is the proof behind that approval and its stage bill. */
  private assertMilestoneOpen(report: any) {
    if (!report?.milestoneId) return;
    const ms = this.milestones.findById(report.milestoneId);
    if (ms && ms.status === 'Completed') {
      throw new ConflictException(`This report is evidence for the approved milestone "${ms.name}", so it can no longer be changed or deleted.`);
    }
  }

  update(id: string, data: any, user?: UserContext) {
    const existing = this.findOne(id);
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');
    this.assertMilestoneOpen(existing);
    if (existing.milestoneId) {
      // The milestone link, progress and submitter of a milestone report cannot be rewritten afterwards.
      data = { ...data };
      for (const k of ['milestoneId', 'milestoneName', 'taskId', 'taskTitle', 'progress', 'projectId', 'submittedBy']) delete data[k];
      if (data.materials && user?.role === 'site_engineer') {
        const project = this.projects.findById(existing.projectId);
        this.linkToMilestone({ ...existing, ...data }, project, { ...user }, id);
      }
      if (Object.keys(data).length === 0) return existing;
    } else if (data.materials && user?.role === 'site_engineer') {
      this.assertMaterialsFromIssuedStock({ ...existing, ...data }, this.projects.findById(existing.projectId), user, id);
    }
    return this.repo.update(id, data);
  }

  remove(id: string) {
    this.assertMilestoneOpen(this.findOne(id));
    return this.repo.remove(id);
  }
}
