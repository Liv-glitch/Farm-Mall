'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add production cost fields to crop_varieties table
    await queryInterface.addColumn('crop_varieties', 'seed_size_1_cost_per_bag', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true, // Allow null during migration, will be updated with seeder
      comment: 'Cost per bag for size 1 seeds in KES'
    });

    await queryInterface.addColumn('crop_varieties', 'seed_size_2_cost_per_bag', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true, // Allow null during migration, will be updated with seeder
      comment: 'Cost per bag for size 2 seeds in KES'
    });

    await queryInterface.addColumn('crop_varieties', 'fertilizer_cost_per_acre', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Total fertilizer cost per acre in KES'
    });

    await queryInterface.addColumn('crop_varieties', 'herbicide_cost_per_acre', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Herbicide cost per acre in KES'
    });

    await queryInterface.addColumn('crop_varieties', 'fungicide_cost_per_acre', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Fungicide cost per acre in KES'
    });

    await queryInterface.addColumn('crop_varieties', 'insecticide_cost_per_acre', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Insecticide cost per acre in KES'
    });

    await queryInterface.addColumn('crop_varieties', 'labor_cost_per_acre', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Total labor cost per acre in KES'
    });

    await queryInterface.addColumn('crop_varieties', 'land_preparation_cost_per_acre', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Land preparation cost per acre in KES'
    });

    await queryInterface.addColumn('crop_varieties', 'miscellaneous_cost_per_acre', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Miscellaneous costs per acre in KES'
    });

    await queryInterface.addColumn('crop_varieties', 'average_yield_per_acre', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Average yield per acre in kg'
    });

    await queryInterface.addColumn('crop_varieties', 'cost_data_updated_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When cost data was last updated'
    });

    // Remove the old generic seed_cost_per_bag column since we now have variety-specific costs
    await queryInterface.removeColumn('crop_varieties', 'seed_cost_per_bag');

    // Add indexes for the new cost fields for better query performance
    await queryInterface.addIndex('crop_varieties', ['fertilizer_cost_per_acre'], {
      name: 'crop_varieties_fertilizer_cost_idx',
    });

    await queryInterface.addIndex('crop_varieties', ['labor_cost_per_acre'], {
      name: 'crop_varieties_labor_cost_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('crop_varieties', 'crop_varieties_fertilizer_cost_idx');
    await queryInterface.removeIndex('crop_varieties', 'crop_varieties_labor_cost_idx');

    // Add back the old seed_cost_per_bag column
    await queryInterface.addColumn('crop_varieties', 'seed_cost_per_bag', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 4000.00 // Default value for rollback
    });

    // Remove all the new cost columns
    await queryInterface.removeColumn('crop_varieties', 'seed_size_1_cost_per_bag');
    await queryInterface.removeColumn('crop_varieties', 'seed_size_2_cost_per_bag');
    await queryInterface.removeColumn('crop_varieties', 'fertilizer_cost_per_acre');
    await queryInterface.removeColumn('crop_varieties', 'herbicide_cost_per_acre');
    await queryInterface.removeColumn('crop_varieties', 'fungicide_cost_per_acre');
    await queryInterface.removeColumn('crop_varieties', 'insecticide_cost_per_acre');
    await queryInterface.removeColumn('crop_varieties', 'labor_cost_per_acre');
    await queryInterface.removeColumn('crop_varieties', 'land_preparation_cost_per_acre');
    await queryInterface.removeColumn('crop_varieties', 'miscellaneous_cost_per_acre');
    await queryInterface.removeColumn('crop_varieties', 'average_yield_per_acre');
    await queryInterface.removeColumn('crop_varieties', 'cost_data_updated_at');
  },
};