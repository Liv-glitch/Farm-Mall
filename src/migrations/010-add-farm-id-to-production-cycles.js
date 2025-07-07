module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add farm_id column as nullable first
    await queryInterface.addColumn('production_cycles', 'farm_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'farms',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Update existing production cycles to link to their users' farms
    await queryInterface.sequelize.query(`
      UPDATE production_cycles pc
      SET farm_id = (
        SELECT f.id 
        FROM farms f 
        WHERE f.owner_id = pc.user_id 
        LIMIT 1
      )
      WHERE EXISTS (
        SELECT 1 
        FROM farms f 
        WHERE f.owner_id = pc.user_id
      );
    `);

    // Make the column non-nullable after updating
    await queryInterface.changeColumn('production_cycles', 'farm_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'farms',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Create index for farm_id
    await queryInterface.addIndex('production_cycles', ['farm_id'], {
      name: 'production_cycles_farm_id_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index
    await queryInterface.removeIndex('production_cycles', 'production_cycles_farm_id_idx');
    
    // Remove column
    await queryInterface.removeColumn('production_cycles', 'farm_id');
  }
}; 