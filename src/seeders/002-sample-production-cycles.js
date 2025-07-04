'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Get existing user (we'll use the swagger test user)
    const users = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = 'swagger@test.com' LIMIT 1",
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    if (users.length === 0) {
      console.log('No users found, skipping production cycles seeding');
      return;
    }
    
    const userId = users[0].id;
    const currentDate = new Date();
    
    const productionCycles = [
      // POTATO PRODUCTION - Current Season
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        user_id: userId,
        crop_variety_id: '550e8400-e29b-41d4-a716-446655440001', // Shangi
        land_size_acres: 2.5,
        farm_location: 'Meru County, Kenya',
        farm_location_lat: -0.2367,
        farm_location_lng: 37.6531,
        planting_date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 15), // Last month
        estimated_harvest_date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 30), // Next month
        status: 'active',
        total_cost: 180000,
        created_at: new Date(),
        updated_at: new Date(),
      },
      
      // MAIZE PRODUCTION - Planning Phase
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        user_id: userId,
        crop_variety_id: '550e8400-e29b-41d4-a716-446655440010', // DH04
        land_size_acres: 5.0,
        farm_location: 'Nakuru County, Kenya',
        farm_location_lat: -0.3031,
        farm_location_lng: 36.0800,
        planting_date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1), // Next month
        estimated_harvest_date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 4, 15), // 4 months from now
        status: 'planning',
        total_cost: 125000,
        created_at: new Date(),
        updated_at: new Date(),
      },
      
      // BEANS PRODUCTION - Recently Harvested
      {
        id: '660e8400-e29b-41d4-a716-446655440003',
        user_id: userId,
        crop_variety_id: '550e8400-e29b-41d4-a716-446655440020', // Rosecoco
        land_size_acres: 1.0,
        farm_location: 'Kiambu County, Kenya',
        farm_location_lat: -1.1744,
        farm_location_lng: 36.8344,
        planting_date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1), // 3 months ago
        estimated_harvest_date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 15), // Last month
        actual_harvest_date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 18), // Last month
        status: 'harvested',
        total_cost: 45000,
        total_yield_kg: 800,
        created_at: new Date(),
        updated_at: new Date(),
      },
      
      // TOMATO PRODUCTION - Greenhouse (High Value)
      {
        id: '660e8400-e29b-41d4-a716-446655440004',
        user_id: userId,
        crop_variety_id: '550e8400-e29b-41d4-a716-446655440033', // Beefmaster F1
        land_size_acres: 0.25, // Quarter acre greenhouse
        farm_location: 'Nyeri County, Kenya',
        farm_location_lat: -0.4167,
        farm_location_lng: 36.9500,
        planting_date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1), // 2 months ago
        estimated_harvest_date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 10), // 2 months from now
        status: 'active',
        total_cost: 85000,
        created_at: new Date(),
        updated_at: new Date(),
      },
      
      // ONION PRODUCTION - Long Season
      {
        id: '660e8400-e29b-41d4-a716-446655440005',
        user_id: userId,
        crop_variety_id: '550e8400-e29b-41d4-a716-446655440040', // Red Pinoy F1
        land_size_acres: 0.75,
        farm_location: 'Laikipia County, Kenya',
        farm_location_lat: 0.5143,
        farm_location_lng: 36.7826,
        planting_date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1), // Last month
        estimated_harvest_date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 1), // 3 months from now
        status: 'active',
        total_cost: 35000,
        created_at: new Date(),
        updated_at: new Date(),
      },
      
      // CARROT PRODUCTION - Planning for Next Season
      {
        id: '660e8400-e29b-41d4-a716-446655440006',
        user_id: userId,
        crop_variety_id: '550e8400-e29b-41d4-a716-446655440060', // Nantes
        land_size_acres: 0.5,
        farm_location: 'Nyandarua County, Kenya',
        farm_location_lat: -0.3500,
        farm_location_lng: 36.4000,
        planting_date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 1), // 2 months from now
        estimated_harvest_date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 5, 10), // 5 months from now
        status: 'planning',
        total_cost: 28000,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('production_cycles', productionCycles);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('production_cycles', null, {});
  }
}; 