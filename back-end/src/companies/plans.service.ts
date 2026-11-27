import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SUBSCRIPTION_PLANS, OVERAGE_RATES, SubscriptionPlanConfig } from './subscription-plans';
import { attachStore } from '../utils/json-store';
import { UpdatePlanDto } from './update-plan.dto';
import { UpdateOverageRatesDto } from './update-overage-rates.dto';
import { CompaniesRepository } from './companies.repository';

export interface PlansFile {
  plans: SubscriptionPlanConfig[];
  overageRates: { extraUserMonthly: number; extraProjectMonthly: number };
}

/**
 * Subscription plan prices and limits, editable by the platform admin.
 *
 * The rest of the code base reads the shared SUBSCRIPTION_PLANS / OVERAGE_RATES objects,
 * so this service updates those objects IN PLACE and persists them to data/db/plans.json.
 * Changes therefore apply everywhere (limits, revenue, subscription pages) immediately.
 */
@Injectable()
export class PlansService {
  constructor(private readonly companiesRepo: CompaniesRepository) {
    attachStore<PlansFile>(
      'plans',
      this.snapshot(),
      () => this.snapshot(),
      (loaded) => {
        for (const plan of loaded.plans || []) {
          if (plan && plan.name) SUBSCRIPTION_PLANS[plan.name] = { ...SUBSCRIPTION_PLANS[plan.name], ...plan };
        }
        if (loaded.overageRates) Object.assign(OVERAGE_RATES, loaded.overageRates);
      },
    );
  }

  private snapshot(): PlansFile {
    return {
      plans: Object.values(SUBSCRIPTION_PLANS).map((p) => ({ ...p })),
      overageRates: { ...OVERAGE_RATES },
    };
  }

  getAll(): PlansFile {
    return this.snapshot();
  }

  updatePlan(name: string, dto: UpdatePlanDto): SubscriptionPlanConfig {
    const plan = SUBSCRIPTION_PLANS[name];
    if (!plan) throw new NotFoundException(`Plan "${name}" not found.`);
    const next = { ...plan, ...this.definedOnly(dto) };
    if (Object.keys(this.definedOnly(dto)).length === 0) {
      throw new BadRequestException('Provide at least one field to update.');
    }
    // Annual price should not exceed 12 months of the monthly price.
    if (next.annualPrice > next.monthlyPrice * 12) {
      throw new BadRequestException('Annual price cannot be higher than 12 times the monthly price.');
    }
    SUBSCRIPTION_PLANS[name] = next;
    this.syncCompanyLimits(name, plan, next);
    return next;
  }

  /**
   * Every company keeps its own copy of the seat / project limit (customUserLimit / customProjectLimit), which the
   * limit checks and the Subscription page read. A company whose copy still equals the old plan figure has not been
   * customised, so it follows the plan when the platform admin changes it. A deliberately different figure is kept.
   */
  private syncCompanyLimits(planName: string, before: SubscriptionPlanConfig, after: SubscriptionPlanConfig) {
    for (const c of this.companiesRepo.findAll()) {
      if (c.plan !== planName || !c.id) continue;
      const changes: { customUserLimit?: number; customProjectLimit?: number } = {};
      if (after.userLimit !== before.userLimit && (c.customUserLimit === undefined || c.customUserLimit === before.userLimit)) {
        changes.customUserLimit = after.userLimit;
      }
      if (after.projectLimit !== before.projectLimit && (c.customProjectLimit === undefined || c.customProjectLimit === before.projectLimit)) {
        changes.customProjectLimit = after.projectLimit;
      }
      if (Object.keys(changes).length) this.companiesRepo.update(c.id, changes);
    }
  }

  updateOverageRates(dto: UpdateOverageRatesDto) {
    const changes = this.definedOnly(dto);
    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('Provide at least one field to update.');
    }
    Object.assign(OVERAGE_RATES, changes);
    return { ...OVERAGE_RATES };
  }

  private definedOnly<T extends object>(obj: T): Partial<T> {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
  }
}
