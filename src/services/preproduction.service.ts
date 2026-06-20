import { Transaction } from 'sequelize';
import { format, subDays } from 'date-fns';
import sequelize from '../config/database';
import { PreproductionPlanModel, PotatoVariety } from '../models/PreproductionPlan.model';
import { PreproductionStepModel } from '../models/PreproductionStep.model';
import { PreproductionTaskModel } from '../models/PreproductionTask.model';
import { ERROR_CODES } from '../utils/constants';

export interface CreatePreproductionPlanRequest {
  name: string;
  planting_date: string;
  location: string;
  potato_variety: PotatoVariety;
}

export interface UpdatePreproductionTaskRequest {
  completed?: boolean;
  date_completed?: string | null;
  cost?: number | null;
  supplier?: string | null;
}

interface TaskTemplate {
  title: string;
  whatYouNeed?: string;
  whatYouNeedLink?: string;
  expertTip?: string;
}

interface StepTemplate {
  title: string;
  /** Days before planting_date the step window opens. */
  daysBeforeStart: number;
  /** Days before planting_date the step window closes. */
  daysBeforeEnd: number;
  tasks: TaskTemplate[];
}

/**
 * Fixed pre-production checklist template. Kept as a single hardcoded const so
 * variety/region-specific variation can be layered on later (e.g. by selecting a
 * different template per variety) without reworking the generation logic.
 */
export const PREPRODUCTION_TEMPLATE: StepTemplate[] = [
  {
    title: 'Land Selection',
    daysBeforeStart: 60,
    daysBeforeEnd: 53,
    tasks: [
      { title: 'Select a well-drained field' },
      {
        title: 'Check crop rotation history',
        expertTip:
          'Skip fields where potatoes, tomatoes, peppers or eggplant grew in the last 2 seasons (disease build-up).',
      },
    ],
  },
  {
    title: 'Soil Testing',
    daysBeforeStart: 50,
    daysBeforeEnd: 40,
    tasks: [
      {
        title: 'Collect soil samples',
        expertTip: 'Sample in a W-pattern across the field at 0–20 cm depth and mix into one composite sample.',
      },
      {
        title: 'Submit sample for testing',
        whatYouNeed: 'Accredited soil testing lab',
      },
    ],
  },
  {
    title: 'Land Preparation',
    daysBeforeStart: 35,
    daysBeforeEnd: 21,
    tasks: [
      {
        title: 'First ploughing',
        whatYouNeed: 'Tractor / ox-plough hire',
        expertTip: 'Plough to ~25 cm depth, ideally 3–4 weeks before planting.',
      },
    ],
  },
  {
    title: 'Seed Sourcing',
    daysBeforeStart: 20,
    daysBeforeEnd: 10,
    tasks: [
      {
        title: 'Buy certified seed potato',
        whatYouNeed: 'Certified seed potato supplier',
        expertTip: 'Use clean, well-sprouted certified seed of your chosen variety to reduce disease risk.',
      },
    ],
  },
  {
    title: 'Planting Readiness',
    daysBeforeStart: 9,
    daysBeforeEnd: 2,
    tasks: [
      {
        title: 'Confirm planting inputs ready',
        whatYouNeed: 'Fertilizer & labour',
      },
      {
        title: 'Check weather window',
        expertTip: 'Aim to plant into moist, warm soil at the onset of the rains.',
      },
    ],
  },
  {
    title: 'Final Review',
    daysBeforeStart: 1,
    daysBeforeEnd: 0,
    tasks: [
      {
        title: 'Final readiness check',
        expertTip: 'Confirm field, seed, inputs and labour are all in place before planting day.',
      },
    ],
  },
];

type StepStatus = 'done' | 'current' | 'upcoming' | 'past';

export class PreproductionService {
  /**
   * Create a plan and auto-generate its steps and tasks from the fixed template.
   */
  async createPlan(userId: string, data: CreatePreproductionPlanRequest) {
    return sequelize.transaction(async (transaction: Transaction) => {
      const plan = await PreproductionPlanModel.create(
        {
          userId,
          name: data.name,
          plantingDate: data.planting_date,
          location: data.location,
          potatoVariety: data.potato_variety,
          status: 'not_started',
        },
        { transaction }
      );

      const plantingDate = new Date(data.planting_date);

      for (let i = 0; i < PREPRODUCTION_TEMPLATE.length; i++) {
        const stepTemplate = PREPRODUCTION_TEMPLATE[i];
        const step = await PreproductionStepModel.create(
          {
            planId: plan.id,
            order: i + 1,
            title: stepTemplate.title,
            dateRangeStart: format(subDays(plantingDate, stepTemplate.daysBeforeStart), 'yyyy-MM-dd'),
            dateRangeEnd: format(subDays(plantingDate, stepTemplate.daysBeforeEnd), 'yyyy-MM-dd'),
          },
          { transaction }
        );

        for (let t = 0; t < stepTemplate.tasks.length; t++) {
          const taskTemplate = stepTemplate.tasks[t];
          await PreproductionTaskModel.create(
            {
              stepId: step.id,
              order: t + 1,
              title: taskTemplate.title,
              whatYouNeed: taskTemplate.whatYouNeed ?? null,
              whatYouNeedLink: taskTemplate.whatYouNeedLink ?? null,
              expertTip: taskTemplate.expertTip ?? null,
              completed: false,
              dateCompleted: null,
              cost: null,
              supplier: null,
            },
            { transaction }
          );
        }
      }

      return this.getPlanById(userId, plan.id, transaction);
    });
  }

  /**
   * List all plans for a user with progress summary (no nested tasks).
   */
  async getUserPlans(userId: string) {
    const plans = await PreproductionPlanModel.findAll({
      where: { userId },
      include: [
        {
          model: PreproductionStepModel,
          as: 'steps',
          include: [{ model: PreproductionTaskModel, as: 'tasks' }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return plans.map((plan) => this.serializePlan(plan, false));
  }

  /**
   * Get a single plan with its steps and tasks. Scoped to the owning user.
   */
  async getPlanById(userId: string, planId: string, transaction?: Transaction) {
    const plan = await PreproductionPlanModel.findOne({
      where: { id: planId, userId },
      include: [
        {
          model: PreproductionStepModel,
          as: 'steps',
          include: [{ model: PreproductionTaskModel, as: 'tasks' }],
        },
      ],
      order: [
        [{ model: PreproductionStepModel, as: 'steps' }, 'order', 'ASC'],
        [{ model: PreproductionStepModel, as: 'steps' }, { model: PreproductionTaskModel, as: 'tasks' }, 'order', 'ASC'],
      ],
      transaction,
    });

    if (!plan) {
      throw new Error(ERROR_CODES.NOT_FOUND);
    }

    return this.serializePlan(plan, true);
  }

  /**
   * Mark a task complete/incomplete (and capture date/cost/supplier). Recomputes
   * the parent plan's status. Scoped to the owning user via the plan relationship.
   */
  async updateTask(userId: string, taskId: string, data: UpdatePreproductionTaskRequest) {
    const task = await PreproductionTaskModel.findByPk(taskId, {
      include: [
        {
          model: PreproductionStepModel,
          as: 'step',
          include: [{ model: PreproductionPlanModel, as: 'plan' }],
        },
      ],
    });

    const plan = (task as any)?.step?.plan as PreproductionPlanModel | undefined;
    if (!task || !plan || plan.userId !== userId) {
      throw new Error(ERROR_CODES.NOT_FOUND);
    }

    const completed = data.completed ?? task.completed;

    if (completed) {
      task.completed = true;
      task.dateCompleted = data.date_completed ?? task.dateCompleted;
      task.cost = data.cost ?? null;
      task.supplier = data.supplier ?? null;
    } else {
      // Undo / mark incomplete clears the completion details.
      task.completed = false;
      task.dateCompleted = null;
      task.cost = null;
      task.supplier = null;
    }

    await task.save();

    await this.recomputePlanStatus(plan.id);

    return this.getPlanById(userId, plan.id);
  }

  /** Recompute and persist the plan's stored status from its tasks. */
  private async recomputePlanStatus(planId: string): Promise<void> {
    const tasks = await PreproductionTaskModel.findAll({
      include: [
        {
          model: PreproductionStepModel,
          as: 'step',
          where: { planId },
          attributes: [],
        },
      ],
    });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;

    let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (total > 0 && completed === total) {
      status = 'completed';
    } else if (completed > 0) {
      status = 'in_progress';
    }

    await PreproductionPlanModel.update({ status }, { where: { id: planId } });
  }

  private computeStepStatus(
    step: PreproductionStepModel,
    tasks: PreproductionTaskModel[],
    today: string
  ): StepStatus {
    if (tasks.length > 0 && tasks.every((t) => t.completed)) {
      return 'done';
    }
    const start = step.dateRangeStart;
    const end = step.dateRangeEnd;
    if (start && today < start) return 'upcoming';
    if (end && today > end) return 'past';
    return 'current';
  }

  /** Build the API payload, attaching derived statuses and progress counts. */
  private serializePlan(plan: PreproductionPlanModel, includeTasks: boolean) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const steps = ((plan as any).steps ?? []) as PreproductionStepModel[];
    const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

    const totalSteps = sortedSteps.length;
    let completedSteps = 0;
    let totalTasks = 0;
    let completedTasks = 0;

    const serializedSteps = sortedSteps.map((step) => {
      const tasks = (((step as any).tasks ?? []) as PreproductionTaskModel[]).sort(
        (a, b) => a.order - b.order
      );
      const stepStatus = this.computeStepStatus(step, tasks, today);
      if (stepStatus === 'done') completedSteps++;
      totalTasks += tasks.length;
      completedTasks += tasks.filter((t) => t.completed).length;

      const base = {
        id: step.id,
        planId: step.planId,
        order: step.order,
        title: step.title,
        dateRangeStart: step.dateRangeStart,
        dateRangeEnd: step.dateRangeEnd,
        status: stepStatus,
      };

      if (!includeTasks) return base;

      return {
        ...base,
        tasks: tasks.map((task) => ({
          id: task.id,
          stepId: task.stepId,
          order: task.order,
          title: task.title,
          whatYouNeed: task.whatYouNeed,
          whatYouNeedLink: task.whatYouNeedLink,
          expertTip: task.expertTip,
          completed: task.completed,
          dateCompleted: task.dateCompleted,
          cost: task.cost !== null && task.cost !== undefined ? Number(task.cost) : null,
          supplier: task.supplier,
        })),
      };
    });

    return {
      id: plan.id,
      userId: plan.userId,
      name: plan.name,
      plantingDate: plan.plantingDate,
      location: plan.location,
      potatoVariety: plan.potatoVariety,
      status: plan.status,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      totalSteps,
      completedSteps,
      totalTasks,
      completedTasks,
      steps: serializedSteps,
    };
  }
}
