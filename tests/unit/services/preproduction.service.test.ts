import { PREPRODUCTION_TEMPLATE, PreproductionService, jsonArrayColumn } from '../../../src/services/preproduction.service';

const findTask = (title: string) => {
  for (const step of PREPRODUCTION_TEMPLATE) {
    const task = step.tasks.find((candidate) => candidate.title === title);
    if (task) return task;
  }

  throw new Error(`Task not found: ${title}`);
};

describe('PREPRODUCTION_TEMPLATE', () => {
  it('uses the requested Land Selection recommendation copy', () => {
    const landSelection = findTask('Land Selection');

    expect(landSelection.activityType).toBe('informational');
    expect(landSelection.recommendations).toEqual([
      'Select well-drained land, avoiding fields where potatoes, tomatoes, peppers, or eggplant were planted in the last 2 seasons.',
      'Review crop rotation history.',
    ]);
    expect(landSelection.serviceLinks).toBeUndefined();
  });

  it('defines Farm Mall service links for every service-linked task', () => {
    expect(findTask('Soil Testing').serviceLinks).toEqual([
      {
        label: 'Access Soil Testing Services here',
        href: 'https://farmflow-platform.onrender.com/marketplace?category=soil-testing',
      },
    ]);
    expect(findTask('First Plowing').serviceLinks).toEqual([
      {
        label: 'Access tractor or ox-plowing services',
        href: 'https://farmflow-platform.onrender.com/marketplace?category=mechanization',
      },
    ]);
    expect(findTask('Second Plowing').serviceLinks).toEqual([
      {
        label: 'Access plowing services',
        href: 'https://farmflow-platform.onrender.com/marketplace?category=mechanization',
      },
    ]);
    expect(findTask('Harrowing').serviceLinks).toEqual([
      {
        label: 'Access harrowing services',
        href: 'https://farmflow-platform.onrender.com/marketplace?category=mechanization',
      },
    ]);
    expect(findTask('Organic Manure Application').serviceLinks).toEqual([
      {
        label: 'Purchase manure through Farm Mall',
        href: 'https://farmflow-platform.onrender.com/marketplace?category=fertilizers',
      },
    ]);
    expect(findTask('Soil Fertility Management').serviceLinks).toEqual([
      {
        label: 'Purchase recommended fertilizers',
        href: 'https://farmflow-platform.onrender.com/marketplace?category=fertilizers',
      },
      {
        label: 'Access agronomy support',
        href: 'https://farmflow-platform.onrender.com/marketplace?category=advisory',
      },
    ]);
  });

  it('marks only actionable farm preparation activities as tasks', () => {
    expect(findTask('Land Selection').activityType).toBe('informational');
    expect(findTask('Residue and Weed Clearance').activityType).toBe('informational');

    [
      'Soil Testing',
      'First Plowing',
      'Second Plowing',
      'Harrowing',
      'Organic Manure Application',
      'Soil Fertility Management',
    ].forEach((title) => {
      expect(findTask(title).activityType).toBe('task');
    });
  });

  it('parses JSON-string database columns into arrays', () => {
    expect(jsonArrayColumn<string>('["Apply based on soil test results."]')).toEqual([
      'Apply based on soil test results.',
    ]);
    expect(jsonArrayColumn<{ label: string; href: string }>(
      '[{"label":"Access Soil Testing Services here","href":"https://farmflow-platform.onrender.com/marketplace?category=soil-testing"}]'
    )).toEqual([
      {
        label: 'Access Soil Testing Services here',
        href: 'https://farmflow-platform.onrender.com/marketplace?category=soil-testing',
      },
    ]);
  });

  it('serializes JSON-string task recommendations and service links as arrays', () => {
    const service = new PreproductionService();
    const plan = {
      id: 'plan-1',
      userId: 'user-1',
      name: 'Potato plan',
      plantingDate: '2026-08-01',
      location: 'Nakuru',
      potatoVariety: 'Shangi',
      status: 'not_started',
      createdAt: new Date('2026-06-01T00:00:00Z'),
      updatedAt: new Date('2026-06-01T00:00:00Z'),
      steps: [
        {
          id: 'step-1',
          planId: 'plan-1',
          order: 1,
          title: 'Soil Testing',
          dateRangeStart: '2026-06-01',
          dateRangeEnd: '2026-07-01',
          tasks: [
            {
              id: 'task-1',
              stepId: 'step-1',
              order: 1,
              title: 'Soil Testing',
              activityType: 'task',
              importance: 'Test the soil.',
              recommendations: '["Use clean sampling tools."]',
              serviceLinks:
                '[{"label":"Access Soil Testing Services here","href":"https://farmflow-platform.onrender.com/marketplace?category=soil-testing"}]',
              whatYouNeed: null,
              whatYouNeedLink: null,
              expertTip: null,
              completed: false,
              dateCompleted: null,
              cost: null,
              supplier: null,
            },
          ],
        },
      ],
    };

    const serialized = (service as any).serializePlan(plan, true);

    expect(serialized.steps[0].tasks[0].recommendations).toEqual(['Use clean sampling tools.']);
    expect(serialized.steps[0].tasks[0].serviceLinks).toEqual([
      {
        label: 'Access Soil Testing Services here',
        href: 'https://farmflow-platform.onrender.com/marketplace?category=soil-testing',
      },
    ]);
  });
});
