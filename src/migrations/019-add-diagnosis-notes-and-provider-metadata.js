'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('plant_health_assessments', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('plant_health_assessments', 'provider_metadata', {
      type: Sequelize.JSONB,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('plant_health_assessments', 'provider_metadata');
    await queryInterface.removeColumn('plant_health_assessments', 'notes');
  }
};
