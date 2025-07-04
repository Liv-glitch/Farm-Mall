'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const cropVarieties = [
      // POTATOES - Early Varieties (60-90 days)
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Shangi',
        crop_type: 'potato',
        maturity_period_days: 75,
        seed_size_1_bags_per_acre: 20,
        seed_size_2_bags_per_acre: 16,
        seed_cost_per_bag: 4500,
        created_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Kenya Mpya',
        crop_type: 'potato',
        maturity_period_days: 80,
        seed_size_1_bags_per_acre: 18,
        seed_size_2_bags_per_acre: 15,
        seed_cost_per_bag: 5000,
        created_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Unica',
        crop_type: 'potato',
        maturity_period_days: 85,
        seed_size_1_bags_per_acre: 22,
        seed_size_2_bags_per_acre: 18,
        seed_cost_per_bag: 4800,
        created_at: new Date(),
      },

      // POTATOES - Medium Varieties (90-120 days)
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Dutch Robijin',
        crop_type: 'potato',
        maturity_period_days: 105,
        seed_size_1_bags_per_acre: 20,
        seed_size_2_bags_per_acre: 16,
        seed_cost_per_bag: 5500,
        created_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        name: 'Markies',
        crop_type: 'potato',
        maturity_period_days: 110,
        seed_size_1_bags_per_acre: 19,
        seed_size_2_bags_per_acre: 15,
        seed_cost_per_bag: 6000,
        created_at: new Date(),
      },

      // MAIZE - Short Season (90-120 days)
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        name: 'DH04',
        crop_type: 'maize',
        maturity_period_days: 105,
        seed_size_1_bags_per_acre: 1, // 25kg bag
        seed_size_2_bags_per_acre: 1,
        seed_cost_per_bag: 3200,
        created_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440011',
        name: 'H629',
        crop_type: 'maize',
        maturity_period_days: 115,
        seed_size_1_bags_per_acre: 1,
        seed_size_2_bags_per_acre: 1,
        seed_cost_per_bag: 3500,
        created_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440012',
        name: 'H516',
        crop_type: 'maize',
        maturity_period_days: 120,
        seed_size_1_bags_per_acre: 1,
        seed_size_2_bags_per_acre: 1,
        seed_cost_per_bag: 3800,
        created_at: new Date(),
      },

      // MAIZE - Long Season (120-150 days)
      {
        id: '550e8400-e29b-41d4-a716-446655440013',
        name: 'H614D',
        crop_type: 'maize',
        maturity_period_days: 135,
        seed_size_1_bags_per_acre: 1,
        seed_size_2_bags_per_acre: 1,
        seed_cost_per_bag: 4000,
        created_at: new Date(),
      },

      // BEANS - Bush Varieties (60-90 days)
      {
        id: '550e8400-e29b-41d4-a716-446655440020',
        name: 'Rosecoco',
        crop_type: 'beans',
        maturity_period_days: 75,
        seed_size_1_bags_per_acre: 2, // 90kg bags per acre
        seed_size_2_bags_per_acre: 2,
        seed_cost_per_bag: 8000,
        created_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440021',
        name: 'Red Haricot',
        crop_type: 'beans',
        maturity_period_days: 80,
        seed_size_1_bags_per_acre: 2,
        seed_size_2_bags_per_acre: 2,
        seed_cost_per_bag: 7500,
        created_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440022',
        name: 'Mwitemania',
        crop_type: 'beans',
        maturity_period_days: 85,
        seed_size_1_bags_per_acre: 2,
        seed_size_2_bags_per_acre: 2,
        seed_cost_per_bag: 9000,
        created_at: new Date(),
      },

      // BEANS - Climbing Varieties (90-120 days)
      {
        id: '550e8400-e29b-41d4-a716-446655440023',
        name: 'Climbing Bean Mix',
        crop_type: 'beans',
        maturity_period_days: 110,
        seed_size_1_bags_per_acre: 1,
        seed_size_2_bags_per_acre: 1,
        seed_cost_per_bag: 12000,
        created_at: new Date(),
      },

      // TOMATOES - Determinate (60-90 days)
      {
        id: '550e8400-e29b-41d4-a716-446655440030',
        name: 'Anna F1',
        crop_type: 'tomato',
        maturity_period_days: 75,
        seed_size_1_bags_per_acre: 1, // 1000 seeds per packet
        seed_size_2_bags_per_acre: 1,
        seed_cost_per_bag: 1200,
        created_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440031',
        name: 'Cal J',
        crop_type: 'tomato',
        maturity_period_days: 80,
        seed_size_1_bags_per_acre: 1,
        seed_size_2_bags_per_acre: 1,
        seed_cost_per_bag: 1500,
        created_at: new Date(),
      },

      // TOMATOES - Indeterminate (90-180 days)
      {
        id: '550e8400-e29b-41d4-a716-446655440032',
        name: 'Money Maker',
        crop_type: 'tomato',
        maturity_period_days: 120,
        seed_size_1_bags_per_acre: 1,
        seed_size_2_bags_per_acre: 1,
        seed_cost_per_bag: 1000,
        created_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440033',
        name: 'Beefmaster F1',
        crop_type: 'tomato',
        maturity_period_days: 130,
        seed_size_1_bags_per_acre: 1,
        seed_size_2_bags_per_acre: 1,
        seed_cost_per_bag: 2500,
        created_at: new Date(),
      },

      // ADDITIONAL CROPS CAN BE ADDED DYNAMICALLY
      
      // ONIONS
      {
        id: '550e8400-e29b-41d4-a716-446655440040',
        name: 'Red Pinoy F1',
        crop_type: 'onion',
        maturity_period_days: 120,
        seed_size_1_bags_per_acre: 1, // 500g pack
        seed_size_2_bags_per_acre: 1,
        seed_cost_per_bag: 8000,
        created_at: new Date(),
      },

      // CABBAGE
      {
        id: '550e8400-e29b-41d4-a716-446655440050',
        name: 'Gloria F1',
        crop_type: 'cabbage',
        maturity_period_days: 90,
        seed_size_1_bags_per_acre: 1, // 1000 seeds
        seed_size_2_bags_per_acre: 1,
        seed_cost_per_bag: 2800,
        created_at: new Date(),
      },

      // CARROTS
      {
        id: '550e8400-e29b-41d4-a716-446655440060',
        name: 'Nantes',
        crop_type: 'carrot',
        maturity_period_days: 100,
        seed_size_1_bags_per_acre: 2, // 250g packs
        seed_size_2_bags_per_acre: 2,
        seed_cost_per_bag: 1200,
        created_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('crop_varieties', cropVarieties);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('crop_varieties', null, {});
  }
}; 