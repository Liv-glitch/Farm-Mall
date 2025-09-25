'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, delete all production cycles that reference crop varieties to avoid foreign key constraints
    await queryInterface.bulkDelete('production_cycles', null, {});

    // Delete all existing crop varieties
    await queryInterface.bulkDelete('crop_varieties', null, {});

    // Insert refined potato varieties with real production cost data
    const { v4: uuidv4 } = require('uuid');

    const refinedPotatoVarieties = [
      {
        id: uuidv4(),
        name: 'Shangi',
        crop_type: 'potato',
        maturity_period_days: 90,
        seed_size_1_bags_per_acre: 16,
        seed_size_2_bags_per_acre: 20,
        seed_size_1_cost_per_acre: 64000.00, // 16 bags × KES 4,000
        seed_size_2_cost_per_acre: 77000.00, // 20 bags × KES 3,850
        fertilizer_cost_per_acre: 17850.00,
        herbicide_cost_per_acre: 4780.00,
        fungicide_cost_per_acre: 3950.00,
        insecticide_cost_per_acre: 5000.00,
        labor_cost_per_acre: 20000.00,
        land_preparation_cost_per_acre: 21500.00,
        miscellaneous_cost_per_acre: 5000.00,
        average_yield_per_acre: 8000.00,
        cost_data_updated_at: new Date(),
        created_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Markies',
        crop_type: 'potato',
        maturity_period_days: 120,
        seed_size_1_bags_per_acre: 16,
        seed_size_2_bags_per_acre: 20,
        seed_size_1_cost_per_acre: 74400.00, // 16 bags × KES 4,650
        seed_size_2_cost_per_acre: 83000.00, // 20 bags × KES 4,150
        fertilizer_cost_per_acre: 17850.00,
        herbicide_cost_per_acre: 4780.00,
        fungicide_cost_per_acre: 3950.00,
        insecticide_cost_per_acre: 5000.00,
        labor_cost_per_acre: 20000.00,
        land_preparation_cost_per_acre: 21500.00,
        miscellaneous_cost_per_acre: 5000.00,
        average_yield_per_acre: 10000.00,
        cost_data_updated_at: new Date(),
        created_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Sherekea',
        crop_type: 'potato',
        maturity_period_days: 100,
        seed_size_1_bags_per_acre: 16,
        seed_size_2_bags_per_acre: 20,
        seed_size_1_cost_per_acre: 64000.00, // 16 bags × KES 4,000
        seed_size_2_cost_per_acre: 69000.00, // 20 bags × KES 3,450
        fertilizer_cost_per_acre: 17850.00,
        herbicide_cost_per_acre: 4780.00,
        fungicide_cost_per_acre: 3950.00,
        insecticide_cost_per_acre: 5000.00,
        labor_cost_per_acre: 20000.00,
        land_preparation_cost_per_acre: 21500.00,
        miscellaneous_cost_per_acre: 5000.00,
        average_yield_per_acre: 9000.00,
        cost_data_updated_at: new Date(),
        created_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Unica',
        crop_type: 'potato',
        maturity_period_days: 90,
        seed_size_1_bags_per_acre: 16,
        seed_size_2_bags_per_acre: 20,
        seed_size_1_cost_per_acre: 64000.00, // 16 bags × KES 4,000
        seed_size_2_cost_per_acre: 69000.00, // 20 bags × KES 3,450
        fertilizer_cost_per_acre: 17850.00,
        herbicide_cost_per_acre: 4780.00,
        fungicide_cost_per_acre: 3950.00,
        insecticide_cost_per_acre: 5000.00,
        labor_cost_per_acre: 20000.00,
        land_preparation_cost_per_acre: 21500.00,
        miscellaneous_cost_per_acre: 5000.00,
        average_yield_per_acre: 8000.00,
        cost_data_updated_at: new Date(),
        created_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('crop_varieties', refinedPotatoVarieties);

    console.log('✅ Potato varieties updated with real production cost data:');
    console.log('   - Shangi: 90 days, Size 1: KES 4,000, Size 2: KES 3,850');
    console.log('   - Markies: 120 days, Size 1: KES 4,650, Size 2: KES 4,150');
    console.log('   - Sherekea: 100 days, Size 1: KES 4,000, Size 2: KES 3,450');
    console.log('   - Unica: 90 days, Size 1: KES 4,000, Size 2: KES 3,450');
    console.log('');
    console.log('📊 Production costs per acre (all varieties):');
    console.log('   - Land preparation: KES 21,500');
    console.log('   - Fertilizers: KES 17,850');
    console.log('   - Herbicides: KES 4,780');
    console.log('   - Fungicides: KES 3,950');
    console.log('   - Insecticides: KES 5,000');
    console.log('   - Labour: KES 20,000');
    console.log('   - Miscellaneous: KES 5,000');
  },

  async down(queryInterface, Sequelize) {
    // Clear the table
    await queryInterface.bulkDelete('crop_varieties', null, {});

    // Restore the old data structure (without the new cost fields)
    const oldCropVarieties = [
      {
        name: 'Shangi',
        crop_type: 'potato',
        maturity_period_days: 75,
        seed_size_1_bags_per_acre: 20,
        seed_size_2_bags_per_acre: 16,
        created_at: new Date(),
      },
      {
        name: 'Markies',
        crop_type: 'potato',
        maturity_period_days: 110,
        seed_size_1_bags_per_acre: 19,
        seed_size_2_bags_per_acre: 15,
        created_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('crop_varieties', oldCropVarieties);
  }
};