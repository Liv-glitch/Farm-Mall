'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const currentDate = new Date();
    
    const activities = [
      // POTATO ACTIVITIES (Active Production Cycle)
      {
        id: '770e8400-e29b-41d4-a716-446655440001',
        production_cycle_id: '660e8400-e29b-41d4-a716-446655440001',
        type: 'soil_preparation',
        description: 'Deep plowing and harrowing for potato bed preparation',
        scheduled_date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1),
        completed_date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1),
        cost: 15000,
        labor_hours: 16,
        labor_type: 'hired',
        inputs: JSON.stringify([
          { name: 'Fuel for tractor', quantity: 50, unit: 'liters', cost: 7500 },
          { name: 'Tractor hire', quantity: 8, unit: 'hours', cost: 7500 }
        ]),
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440002',
        production_cycle_id: '660e8400-e29b-41d4-a716-446655440001',
        type: 'planting',
        description: 'Potato seed planting - Shangi variety',
        scheduled_date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 15),
        completed_date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 15),
        cost: 125000,
        labor_hours: 24,
        labor_type: 'family',
        inputs: JSON.stringify([
          { name: 'Certified potato seeds', quantity: 50, unit: 'bags', cost: 225000 },
          { name: 'DAP fertilizer', quantity: 8, unit: 'bags', cost: 40000 },
          { name: 'Manure', quantity: 20, unit: 'tons', cost: 60000 }
        ]),
        notes: 'Good weather conditions, seeds planted at 30cm spacing',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440003',
        production_cycle_id: '660e8400-e29b-41d4-a716-446655440001',
        type: 'fertilizing',
        description: 'First top dressing with CAN fertilizer',
        scheduled_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
        cost: 18000,
        labor_hours: 8,
        labor_type: 'family',
        inputs: JSON.stringify([
          { name: 'CAN fertilizer', quantity: 4, unit: 'bags', cost: 18000 }
        ]),
        status: 'planned',
        created_at: new Date(),
        updated_at: new Date(),
      },

      // MAIZE ACTIVITIES (Planning Phase)
      {
        id: '770e8400-e29b-41d4-a716-446655440010',
        production_cycle_id: '660e8400-e29b-41d4-a716-446655440002',
        type: 'soil_preparation',
        description: 'Land clearing and preparation for maize planting',
        scheduled_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 20),
        cost: 25000,
        labor_hours: 20,
        labor_type: 'hired',
        inputs: JSON.stringify([
          { name: 'Tractor services', quantity: 10, unit: 'hours', cost: 15000 },
          { name: 'Fuel', quantity: 60, unit: 'liters', cost: 10000 }
        ]),
        status: 'planned',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440011',
        production_cycle_id: '660e8400-e29b-41d4-a716-446655440002',
        type: 'planting',
        description: 'Maize seed planting - DH04 hybrid variety',
        scheduled_date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
        cost: 35000,
        labor_hours: 16,
        labor_type: 'cooperative',
        inputs: JSON.stringify([
          { name: 'DH04 maize seeds', quantity: 5, unit: 'bags', cost: 16000 },
          { name: 'DAP fertilizer', quantity: 6, unit: 'bags', cost: 30000 },
          { name: 'Planting service', quantity: 5, unit: 'acres', cost: 10000 }
        ]),
        status: 'planned',
        created_at: new Date(),
        updated_at: new Date(),
      },

      // BEAN ACTIVITIES (Completed Production)
      {
        id: '770e8400-e29b-41d4-a716-446655440020',
        production_cycle_id: '660e8400-e29b-41d4-a716-446655440003',
        type: 'harvesting',
        description: 'Bean harvest - Rosecoco variety',
        scheduled_date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 15),
        completed_date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 18),
        cost: 8000,
        labor_hours: 12,
        labor_type: 'family',
        inputs: JSON.stringify([
          { name: 'Harvesting bags', quantity: 20, unit: 'pieces', cost: 2000 },
          { name: 'Transport', quantity: 1, unit: 'trip', cost: 6000 }
        ]),
        notes: 'Good harvest - 800kg yield achieved',
        weather: JSON.stringify({
          temperature: 24,
          humidity: 65,
          conditions: 'sunny'
        }),
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      },

      // TOMATO ACTIVITIES (Greenhouse Production)
      {
        id: '770e8400-e29b-41d4-a716-446655440030',
        production_cycle_id: '660e8400-e29b-41d4-a716-446655440004',
        type: 'pest_control',
        description: 'Integrated pest management - Aphid and whitefly control',
        scheduled_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 10),
        cost: 5500,
        labor_hours: 4,
        labor_type: 'hired',
        inputs: JSON.stringify([
          { name: 'Neem oil', quantity: 2, unit: 'liters', cost: 3000 },
          { name: 'Yellow sticky traps', quantity: 20, unit: 'pieces', cost: 1500 },
          { name: 'Sprayer service', quantity: 1, unit: 'session', cost: 1000 }
        ]),
        status: 'planned',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440031',
        production_cycle_id: '660e8400-e29b-41d4-a716-446655440004',
        type: 'irrigation',
        description: 'Drip irrigation system maintenance and adjustment',
        scheduled_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 5),
        completed_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 5),
        cost: 2500,
        labor_hours: 6,
        labor_type: 'family',
        inputs: JSON.stringify([
          { name: 'Drip tape replacement', quantity: 100, unit: 'meters', cost: 2000 },
          { name: 'Fertilizer injection', quantity: 1, unit: 'service', cost: 500 }
        ]),
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      },

      // ONION ACTIVITIES (Current Production)
      {
        id: '770e8400-e29b-41d4-a716-446655440040',
        production_cycle_id: '660e8400-e29b-41d4-a716-446655440005',
        type: 'weeding',
        description: 'Hand weeding around onion seedlings',
        scheduled_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 12),
        cost: 6000,
        labor_hours: 12,
        labor_type: 'hired',
        inputs: JSON.stringify([
          { name: 'Hand tools', quantity: 4, unit: 'pieces', cost: 1000 },
          { name: 'Labor cost', quantity: 12, unit: 'hours', cost: 5000 }
        ]),
        status: 'planned',
        created_at: new Date(),
        updated_at: new Date(),
      },

      // CARROT ACTIVITIES (Planning Phase)
      {
        id: '770e8400-e29b-41d4-a716-446655440050',
        production_cycle_id: '660e8400-e29b-41d4-a716-446655440006',
        type: 'soil_preparation',
        description: 'Fine bed preparation for carrot planting',
        scheduled_date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 20),
        cost: 8000,
        labor_hours: 10,
        labor_type: 'family',
        inputs: JSON.stringify([
          { name: 'Organic compost', quantity: 5, unit: 'tons', cost: 5000 },
          { name: 'Hand tools rental', quantity: 1, unit: 'day', cost: 3000 }
        ]),
        notes: 'Fine tilth required for good carrot germination',
        status: 'planned',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('activities', activities);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('activities', null, {});
  }
}; 