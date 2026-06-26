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
  activityType: 'informational' | 'task';
  importance: string;
  recommendations?: string[];
  serviceLinks?: { label: string; href: string }[];
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
    daysBeforeEnd: 45,
    tasks: [
      {
        title: 'Land Selection',
        activityType: 'informational',
        importance:
          'Choose a well-drained field with a suitable crop rotation history to reduce disease pressure and improve yields.',
        recommendations: [
          'Select well-drained land, avoiding fields where potatoes, tomatoes, peppers, or eggplant were planted in the last 2 seasons.',
          'Review crop rotation history.',
        ],
      },
    ],
  },
  {
    title: 'Soil Testing',
    daysBeforeStart: 42,
    daysBeforeEnd: 21,
    tasks: [
      {
        title: 'Soil Testing',
        activityType: 'task',
        importance:
          'Soil testing helps determine nutrient requirements and pH levels, ensuring accurate fertilizer recommendations and reducing unnecessary input costs.',
        serviceLinks: [
          {
            label: 'Access Soil Testing Services here',
            href: 'https://farmflow-platform.onrender.com/marketplace?category=soil-testing',
          },
        ],
      },
    ],
  },
  {
    title: 'Land Preparation',
    daysBeforeStart: 28,
    daysBeforeEnd: 7,
    tasks: [
      {
        title: 'Residue and Weed Clearance',
        activityType: 'informational',
        importance:
          'Removing previous crop residues and weeds reduces pest and disease carryover while improving field preparation.',
      },
      {
        title: 'First Plowing',
        activityType: 'task',
        importance: 'Breaks compacted soil and improves aeration for root development.',
        recommendations: ['Plow to approximately 12 cm depth.', 'Ideally complete this 3–4 weeks before planting.'],
        serviceLinks: [
          {
            label: 'Access tractor or ox-plowing services',
            href: 'https://farmflow-platform.onrender.com/marketplace?category=mechanization',
          },
        ],
      },
      {
        title: 'Second Plowing',
        activityType: 'task',
        importance: 'Creates a finer seedbed and improves soil structure for planting.',
        recommendations: ['Conduct after initial soil settling.', 'Ensure clods are adequately broken down.'],
        serviceLinks: [
          {
            label: 'Access plowing services',
            href: 'https://farmflow-platform.onrender.com/marketplace?category=mechanization',
          },
        ],
      },
      {
        title: 'Harrowing',
        activityType: 'task',
        importance: 'Produces a fine, level seedbed and helps incorporate amendments.',
        recommendations: ['Ensure soil is loose and level before planting.'],
        serviceLinks: [
          {
            label: 'Access harrowing services',
            href: 'https://farmflow-platform.onrender.com/marketplace?category=mechanization',
          },
        ],
      },
      {
        title: 'Organic Manure Application',
        activityType: 'task',
        importance: 'Improves soil organic matter, water retention, and nutrient availability.',
        recommendations: ['Use well-decomposed manure.', 'Apply based on soil fertility needs.'],
        serviceLinks: [
          {
            label: 'Purchase manure through Farm Mall',
            href: 'https://farmflow-platform.onrender.com/marketplace?category=fertilizers',
          },
        ],
      },
    ],
  },
  {
    title: 'Soil Fertility Management',
    daysBeforeStart: 14,
    daysBeforeEnd: 0,
    tasks: [
      {
        title: 'Soil Fertility Management',
        activityType: 'task',
        importance: 'Proper fertility management improves plant growth, yield, and tuber quality.',
        recommendations: ['Based on your soil test results, apply the recommended nutrients and amendments.'],
        serviceLinks: [
          {
            label: 'Purchase recommended fertilizers',
            href: 'https://farmflow-platform.onrender.com/marketplace?category=fertilizers',
          },
          {
            label: 'Access agronomy support',
            href: 'https://farmflow-platform.onrender.com/marketplace?category=advisory',
          },
        ],
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
              activityType: taskTemplate.activityType,
              importance: taskTemplate.importance,
              recommendations: taskTemplate.recommendations ?? null,
              serviceLinks: taskTemplate.serviceLinks ?? null,
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
   * Delete a user's plan. Steps and tasks are removed by database cascades.
   */
  async deletePlan(userId: string, planId: string): Promise<void> {
    const deleted = await PreproductionPlanModel.destroy({
      where: { id: planId, userId },
    });

    if (deleted === 0) {
      throw new Error(ERROR_CODES.NOT_FOUND);
    }
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

    if (task.activityType === 'informational') {
      throw new Error(ERROR_CODES.INVALID_REQUEST);
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

    const actionableTasks = tasks.filter((t) => t.activityType === 'task');
    const total = actionableTasks.length;
    const completed = actionableTasks.filter((t) => t.completed).length;

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
    const actionableTasks = tasks.filter((t) => t.activityType === 'task');
    if (actionableTasks.length > 0 && actionableTasks.every((t) => t.completed)) {
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

    const totalSteps = sortedSteps.filter((step) => {
      const tasks = (((step as any).tasks ?? []) as PreproductionTaskModel[]);
      return tasks.some((task) => task.activityType === 'task');
    }).length;
    let completedSteps = 0;
    let totalTasks = 0;
    let completedTasks = 0;

    const serializedSteps = sortedSteps.map((step) => {
      const tasks = (((step as any).tasks ?? []) as PreproductionTaskModel[]).sort(
        (a, b) => a.order - b.order
      );
      const actionableTasks = tasks.filter((task) => task.activityType === 'task');
      const stepStatus = this.computeStepStatus(step, tasks, today);
      if (actionableTasks.length > 0 && stepStatus === 'done') completedSteps++;
      totalTasks += actionableTasks.length;
      completedTasks += actionableTasks.filter((t) => t.completed).length;

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
          activityType: task.activityType,
          importance: task.importance,
          recommendations: task.recommendations ?? [],
          serviceLinks: task.serviceLinks ?? [],
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
