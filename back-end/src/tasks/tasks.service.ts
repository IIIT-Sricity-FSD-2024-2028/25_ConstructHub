import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { TasksRepository } from './tasks.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { ProgressService } from '../milestones/progress.service';
import { UsersRepository } from '../users/users.repository';
import { UserContext } from '../auth/current-user.decorator';
import { randomUUID } from 'crypto';

@Injectable()
export class TasksService {
  constructor(
    private readonly repo: TasksRepository,
    private readonly projects: ProjectsRepository,
    @Inject(forwardRef(() => ProgressService)) private readonly progress: ProgressService,
    private readonly users: UsersRepository,
  ) {}

  /**
   * The people working on a project: its PM, FM and the site engineers with tasks on it (id, name and role only).
   * The project's own client may read it (clients cannot list tasks), so the client workspace can limit its chat to this team.
   */
  teamOf(user: UserContext, projectId: string) {
    const project = this.projects.findById(projectId);
    const allowed = project && (
      user.role === 'superuser'
      || (user.role === 'client' && project.clientId === user.userId)
      || (user.role !== 'client' && project.companyId === user.companyId)
    );
    if (!project || !allowed) throw new NotFoundException('Project not found.');
    const ids = new Set<string>([project.managerId, project.financeManagerId, project.siteEngineerId].filter(Boolean));
    this.repo.findAll().filter((t) => t.projectId === projectId && t.assignedTo).forEach((t) => ids.add(t.assignedTo));
    return [...ids]
      .map((id) => this.users.findById(id))
      .filter((u) => u && u.status !== 'inactive')
      .map((u) => ({ id: u.id, name: u.name, role: u.role }));
  }

  findAll() { return this.repo.findAll(); }

  findByCompanyId(companyId: string) { return this.repo.findByCompanyId(companyId); }

  findOne(id: string) {
    const record = this.repo.findById(id);
    if (!record) throw new NotFoundException('Tasks record not found.');
    return record;
  }

  /** Mobilization Advance gate: no task work while the project waits for the client's advance payment. */
  private assertAdvancePaid(projectId: string) {
    const project = this.projects.findById(projectId);
    if (project?.status === 'Awaiting Advance') {
      throw new BadRequestException('Task work is locked until the client pays the mobilization advance (Bill #1).');
    }
  }

  create(data: any) {
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');
    this.validateBusinessRules(data);
    this.assertProjectBelongsToCompany(data);
    this.assertAdvancePaid(data.projectId);
    if (data.milestoneId) this.progress.assertAssignable(data.projectId, data.milestoneId);
    const record = { ...data, id: data.id || randomUUID() };
    const created = this.repo.create(record);
    this.progress.recalculateProject(created.projectId);
    return created;
  }

  update(id: string, data: any) {
    const existing = this.findOne(id);
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');

    const merged = { ...existing, ...data };
    this.validateBusinessRules(merged);
    this.assertProjectBelongsToCompany(merged);
    this.assertAdvancePaid(merged.projectId);
    // Only (re)validate the milestone when the task is being moved to one, or its project changed.
    if (merged.milestoneId && (data.milestoneId !== undefined || data.projectId !== undefined)) {
      this.progress.assertAssignable(merged.projectId, merged.milestoneId);
    }

    const updated = this.repo.update(id, data);
    this.progress.recalculateProject(merged.projectId);
    if (existing.projectId !== merged.projectId) this.progress.recalculateProject(existing.projectId);
    return updated;
  }

  /** A task may only be filed under a project of its own company (stops cross-company tampering with progress). */
  private assertProjectBelongsToCompany(data: any) {
    const project = this.projects.findById(data.projectId);
    if (!project) throw new BadRequestException('Project not found.');
    if (data.companyId && project.companyId !== data.companyId) {
      throw new ForbiddenException('That project belongs to another company.');
    }
  }

  private validateBusinessRules(data: any) {
    if (data.startDate && data.deadline) {
      const start = new Date(data.startDate);
      const deadline = new Date(data.deadline);
      if (start > deadline) {
        throw new BadRequestException('Deadline cannot be before start date.');
      }
    }
    // Task progress feeds milestone and project progress, so status and percentage must agree.
    if (data.status === 'Completed' && Number(data.progress) < 100) {
      throw new BadRequestException('A completed task must be 100% complete.');
    }
    if (Number(data.progress) >= 100 && data.status !== undefined && data.status !== 'Completed') {
      throw new BadRequestException("A task at 100% must have status 'Completed'.");
    }
  }

  remove(id: string) {
    const existing = this.findOne(id);
    const removed = this.repo.remove(id);
    this.progress.recalculateProject(existing.projectId);
    return removed;
  }
}
