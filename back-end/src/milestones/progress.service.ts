import { Injectable, OnModuleInit, Inject, forwardRef, ConflictException, BadRequestException } from '@nestjs/common';
import { ProjectsRepository } from '../projects/projects.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { MilestonesRepository, MilestoneRecord, MilestoneStatus, SEED_TASK_LINKS } from './milestones.repository';
import { today } from '../utils/ids';

const isTaskDone = (t: any) => t.status === 'Completed' || Number(t.progress) >= 100;

/**
 * Single place that turns task progress into milestone and project progress.
 *
 *  - Milestone progress  = average progress of its tasks.
 *  - Milestone status    = Pending -> In Progress -> Ready for Review (all tasks done) -> Completed (PM approval).
 *  - Physical progress   = sum(weight x milestone progress) / 100. Weight not yet allocated counts as 0%,
 *                          so a project can never look finished while planning is incomplete.
 *  - Milestone completion = approved milestones / all milestones.
 *
 * The two project numbers are shown side by side so "3 of 4 milestones approved" and "62% of the physical work done"
 * cannot be confused. Results are written to the milestone and project records so every existing page keeps working.
 */
@Injectable()
export class ProgressService implements OnModuleInit {
  constructor(
    private readonly milestones: MilestonesRepository,
    private readonly projects: ProjectsRepository,
    @Inject(forwardRef(() => TasksRepository)) private readonly tasks: TasksRepository,
  ) {}

  onModuleInit() {
    // Older saved data: link the demo tasks to the demo milestones once.
    for (const [taskId, msId] of Object.entries(SEED_TASK_LINKS)) {
      const task = this.tasks.findById(taskId);
      const ms = this.milestones.findById(msId);
      if (task && ms && task.milestoneId === undefined && task.projectId === ms.projectId) {
        this.tasks.update(taskId, { milestoneId: msId });
      }
    }
    const projectIds = new Set(this.milestones.findAll().map((m) => m.projectId));
    projectIds.forEach((id) => this.recalculateProject(id));
  }

  /** A milestone can receive tasks only if it belongs to the task's project and is not already approved. */
  assertAssignable(projectId: string, milestoneId: string) {
    const ms = this.milestones.findById(milestoneId);
    if (!ms) throw new BadRequestException('Milestone not found.');
    if (ms.projectId !== projectId) throw new BadRequestException('That milestone belongs to a different project.');
    if (ms.status === 'Completed') {
      throw new ConflictException('This milestone is already approved. Reopen it before adding or changing its tasks.');
    }
    return ms;
  }

  recalculateProject(projectId: string) {
    const list = this.milestones.findByProjectId(projectId);
    const project = this.projects.findById(projectId);
    if (!project) return null;

    if (list.length === 0) {
      // Back to manual progress when the last milestone is gone.
      if (project.progressMode === 'milestones') {
        this.projects.update(projectId, { progressMode: null, milestoneCompletion: null, weightAllocated: null });
      }
      return null;
    }

    const allTasks = this.tasks.findAll();
    let physical = 0;
    let approved = 0;
    let weightAllocated = 0;

    for (const m of list) {
      const ts = allTasks.filter((t) => t.milestoneId === m.id);
      const n = ts.length;
      const progress = n ? Math.round(ts.reduce((s, t) => s + (Number(t.progress) || 0), 0) / n) : 0;
      const done = ts.filter(isTaskDone).length;
      const allDone = n > 0 && done === n;

      let status: MilestoneStatus;
      if (m.status === 'Completed' && allDone) status = 'Completed'; // stays approved while all work is still done
      else if (allDone) status = 'Ready for Review';
      else if (ts.some((t) => Number(t.progress) > 0 || t.status === 'In Progress' || t.status === 'Completed')) status = 'In Progress';
      else status = 'Pending';

      const patch: Partial<MilestoneRecord> = { progress, taskCount: n, completedTasks: done, status };
      if (status !== 'Completed') { patch.approvedBy = undefined; patch.approvedAt = undefined; }
      const changed = (Object.keys(patch) as Array<keyof MilestoneRecord>).some((k) => m[k] !== patch[k]);
      if (changed) this.milestones.update(m.id, { ...patch, updatedAt: today() });

      physical += (m.weight * progress) / 100;
      weightAllocated += m.weight;
      if (status === 'Completed') approved++;
    }

    const next = {
      progress: Math.min(100, Math.round(physical)),
      milestoneCompletion: Math.round((approved / list.length) * 100),
      weightAllocated,
      progressMode: 'milestones',
    };
    if ((Object.keys(next) as Array<keyof typeof next>).some((k) => project[k] !== next[k])) {
      this.projects.update(projectId, next);
    }
    return next;
  }

  /** Read-model for the progress screens (recalculated first so it is always current). */
  summary(projectId: string) {
    this.recalculateProject(projectId);
    const project = this.projects.findById(projectId);
    const list = this.milestones.findByProjectId(projectId).sort((a, b) => a.deadline.localeCompare(b.deadline));
    const views = list.map((m) => this.view(m));
    return {
      projectId,
      projectName: project?.name,
      mode: project?.progressMode === 'milestones' ? 'milestones' : 'manual',
      physicalProgress: project?.progress ?? 0,
      milestoneCompletion: project?.milestoneCompletion ?? 0,
      weightAllocated: list.reduce((s, m) => s + m.weight, 0),
      milestonesTotal: list.length,
      milestonesApproved: list.filter((m) => m.status === 'Completed').length,
      delayedMilestones: views.filter((v) => v.delayed).length,
      milestones: views,
    };
  }

  /** Milestone plus date-dependent fields (delay is relative to today, so it is never stored). */
  view(m: MilestoneRecord) {
    const delayed = m.status !== 'Completed' && m.deadline < today();
    const daysLate = delayed ? Math.max(1, Math.round((Date.parse(today()) - Date.parse(m.deadline)) / 86400000)) : 0;
    return { ...m, delayed, daysLate };
  }
}
