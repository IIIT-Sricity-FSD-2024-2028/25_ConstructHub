import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { UserContext } from '../auth/current-user.decorator';
import { ProjectsRepository } from '../projects/projects.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { UsersRepository } from '../users/users.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { ReportsRepository } from '../reports/reports.repository';
import { MilestonesRepository, MilestoneRecord } from './milestones.repository';
import { ProgressService } from './progress.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './milestone.dto';
import { today } from '../utils/ids';

const MAX_MILESTONES_PER_PROJECT = 30;

@Injectable()
export class MilestonesService {
  constructor(
    private readonly repo: MilestonesRepository,
    private readonly progress: ProgressService,
    private readonly projects: ProjectsRepository,
    private readonly tasks: TasksRepository,
    private readonly users: UsersRepository,
    private readonly notifications: NotificationsService,
    private readonly reports: ReportsRepository,
  ) {}

  // ───────────── access helpers ─────────────

  private mustGetProject(projectId: string) {
    const p = this.projects.findById(projectId);
    if (!p) throw new NotFoundException('Project not found.');
    return p;
  }

  /** Who may read a project's milestones. Unknown / forbidden projects look the same (404). */
  private assertCanRead(user: UserContext, project: any) {
    if (user.role === 'superuser') return;
    if (user.role === 'client') {
      if (project.clientId === user.userId) return;
    } else if (project.companyId === user.companyId) {
      if (user.role === 'finance_manager' && project.financeManagerId !== user.userId) {
        throw new NotFoundException('Project not found.');
      }
      return;
    }
    throw new NotFoundException('Project not found.');
  }

  /** Company admins manage any company project; a project manager only the projects assigned to them. */
  private assertCanManage(user: UserContext, project: any) {
    if (user.role === 'superuser') throw new ForbiddenException('The platform admin cannot manage project milestones.');
    if (project.companyId !== user.companyId) throw new NotFoundException('Project not found.');
    if (user.role === 'company_admin') return;
    if (user.role === 'project_manager' && project.managerId === user.userId) return;
    throw new ForbiddenException('Only the assigned project manager or a company admin can manage milestones.');
  }

  private mustGetMilestone(id: string): MilestoneRecord {
    const m = this.repo.findById(id);
    if (!m) throw new NotFoundException('Milestone not found.');
    return m;
  }

  private validateInput(project: any, input: { deadline?: string; weight?: number; name?: string }, excludeId?: string) {
    const siblings = this.repo.findByProjectId(project.id).filter((m) => m.id !== excludeId);
    if (input.name !== undefined && siblings.some((m) => m.name.toLowerCase() === input.name!.trim().toLowerCase())) {
      throw new ConflictException(`This project already has a milestone named "${input.name.trim()}".`);
    }
    if (input.weight !== undefined) {
      const used = siblings.reduce((s, m) => s + m.weight, 0);
      if (used + input.weight > 100) {
        throw new BadRequestException(`Milestone weights cannot add up to more than 100%. Other milestones use ${used}%, so at most ${100 - used}% is left.`);
      }
    }
    if (input.deadline !== undefined) {
      if (Number.isNaN(Date.parse(input.deadline))) throw new BadRequestException('Deadline is not a valid date.');
      if (project.startDate && input.deadline < project.startDate) {
        throw new BadRequestException(`Deadline cannot be before the project start date (${project.startDate}).`);
      }
    }
  }

  private notify(userId: string, companyId: string, title: string, body: string) {
    this.notifications.create({ userId, companyId, title, body, message: body, date: today(), time: 'Just now', read: false });
  }

  // ───────────── reads ─────────────

  /** The internal stage budget (the company's site cost) is only for the people who manage the money. */
  private forViewer<T extends Record<string, any>>(user: UserContext, m: T): T {
    if (['superuser', 'company_admin', 'project_manager', 'finance_manager'].includes(user.role)) return m;
    const { internalBudget, ...rest } = m;
    return rest as T;
  }

  list(user: UserContext, projectId?: string) {
    if (projectId) {
      const project = this.mustGetProject(projectId);
      this.assertCanRead(user, project);
      return this.progress.summary(projectId).milestones.map((m) => this.forViewer(user, m));
    }
    // No project given: everything the caller may see.
    const visible = this.projects.findAll().filter((p) => {
      try { this.assertCanRead(user, p); return true; } catch { return false; }
    });
    return visible
      .flatMap((p) => this.repo.findByProjectId(p.id))
      .map((m) => this.forViewer(user, this.progress.view(m)))
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }

  getOne(user: UserContext, id: string) {
    const m = this.mustGetMilestone(id);
    this.assertCanRead(user, this.mustGetProject(m.projectId));
    const tasks = this.tasks.findAll().filter((t) => t.milestoneId === id);
    return { ...this.forViewer(user, this.progress.view(m)), tasks: user.role === 'client' ? undefined : tasks };
  }

  projectSummary(user: UserContext, projectId: string) {
    const project = this.mustGetProject(projectId);
    this.assertCanRead(user, project);
    const summary = this.progress.summary(projectId);
    return { ...summary, milestones: summary.milestones.map((m) => this.forViewer(user, m)) };
  }

  // ───────────── writes ─────────────

  create(user: UserContext, dto: CreateMilestoneDto) {
    const project = this.mustGetProject(dto.projectId);
    this.assertCanManage(user, project);
    if (project.status === 'Completed') throw new BadRequestException('This project is completed; milestones can no longer be added.');
    if (this.repo.findByProjectId(project.id).length >= MAX_MILESTONES_PER_PROJECT) {
      throw new BadRequestException(`A project can have at most ${MAX_MILESTONES_PER_PROJECT} milestones.`);
    }
    this.validateInput(project, { deadline: dto.deadline, weight: dto.weight, name: dto.name });
    const now = today();
    const created = this.repo.create({
      companyId: project.companyId,
      projectId: project.id,
      name: dto.name.trim(),
      description: dto.description?.trim() || '',
      deadline: dto.deadline,
      weight: dto.weight,
      status: 'Pending',
      progress: 0,
      taskCount: 0,
      completedTasks: 0,
      createdBy: user.userId,
      createdAt: now,
      updatedAt: now,
    });
    this.progress.recalculateProject(project.id);
    return this.progress.view(this.mustGetMilestone(created.id));
  }

  update(user: UserContext, id: string, dto: UpdateMilestoneDto) {
    const m = this.mustGetMilestone(id);
    const project = this.mustGetProject(m.projectId);
    this.assertCanManage(user, project);
    if (m.status === 'Completed') throw new ConflictException('An approved milestone cannot be edited. Reopen it first.');
    this.validateInput(project, { deadline: dto.deadline, weight: dto.weight, name: dto.name }, id);
    const patch: Partial<MilestoneRecord> = { updatedAt: today() };
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.description !== undefined) patch.description = dto.description.trim();
    if (dto.deadline !== undefined) patch.deadline = dto.deadline;
    if (dto.weight !== undefined) patch.weight = dto.weight;
    this.repo.update(id, patch);
    this.progress.recalculateProject(project.id);
    return this.progress.view(this.mustGetMilestone(id));
  }

  remove(user: UserContext, id: string) {
    const m = this.mustGetMilestone(id);
    const project = this.mustGetProject(m.projectId);
    this.assertCanManage(user, project);
    if (m.status === 'Completed') throw new ConflictException('An approved milestone cannot be deleted. Reopen it first.');
    // Tasks are kept; they just no longer belong to a milestone.
    this.tasks.findAll().filter((t) => t.milestoneId === id).forEach((t) => this.tasks.update(t.id, { milestoneId: null }));
    this.repo.remove(id);
    this.progress.recalculateProject(project.id);
    return { message: 'Milestone deleted. Its tasks were kept and are now unassigned.' };
  }

  /** PM verification: only when every task of the milestone is finished. */
  approve(user: UserContext, id: string) {
    const m = this.mustGetMilestone(id);
    const project = this.mustGetProject(m.projectId);
    this.assertCanManage(user, project);
    this.progress.recalculateProject(project.id); // make sure the status is current
    const fresh = this.mustGetMilestone(id);
    if (fresh.status === 'Completed') throw new ConflictException('This milestone is already approved.');
    if (fresh.taskCount === 0) throw new BadRequestException('Add at least one task to this milestone before approving it.');
    if (fresh.status !== 'Ready for Review') {
      throw new BadRequestException(`Only milestones whose tasks are all complete can be approved (${fresh.completedTasks} of ${fresh.taskCount} tasks done).`);
    }
    // Evidence: the PM approves on the strength of what the site engineers reported, not on a bare claim.
    const evidence = this.reports.findAll().filter((r) => r.projectId === project.id && r.milestoneId === id).length;
    if (evidence === 0) {
      throw new BadRequestException('Attach at least one site report to this milestone before approving it. Site engineers link their daily reports to the milestone when they submit them.');
    }
    this.repo.update(id, { status: 'Completed', approvedBy: user.userId, approvedAt: new Date().toISOString(), updatedAt: today() });
    const summary = this.progress.summary(project.id);

    const body = `Milestone "${fresh.name}" of ${project.name} was verified and approved (${summary.milestonesApproved} of ${summary.milestonesTotal} milestones done).`;
    if (project.clientId) this.notify(project.clientId, '', 'Milestone completed', body);
    if (project.financeManagerId && project.financeManagerId !== user.userId) {
      this.notify(project.financeManagerId, project.companyId, 'Milestone ready for billing', `Milestone "${fresh.name}" of ${project.name} was approved by the PM and is now ready for stage RA billing.`);
    }
    this.users.findByCompanyId(project.companyId)
      .filter((u) => u.role === 'company_admin' && u.id !== user.userId)
      .forEach((u) => this.notify(u.id, project.companyId, 'Milestone completed', body));
    return this.progress.view(this.mustGetMilestone(id));
  }

  reopen(user: UserContext, id: string) {
    const m = this.mustGetMilestone(id);
    const project = this.mustGetProject(m.projectId);
    this.assertCanManage(user, project);
    if (m.status !== 'Completed') throw new BadRequestException('Only an approved milestone can be reopened.');
    this.repo.update(id, { status: 'Ready for Review', approvedBy: undefined, approvedAt: undefined, updatedAt: today() });
    this.progress.recalculateProject(project.id);
    return this.progress.view(this.mustGetMilestone(id));
  }
}
