'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Update the enum to include new crop types
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_crop_varieties_crop_type" 
      ADD VALUE IF NOT EXISTS 'onion';
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_crop_varieties_crop_type" 
      ADD VALUE IF NOT EXISTS 'cabbage';
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_crop_varieties_crop_type" 
      ADD VALUE IF NOT EXISTS 'carrot';
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_crop_varieties_crop_type" 
      ADD VALUE IF NOT EXISTS 'spinach';
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_crop_varieties_crop_type" 
      ADD VALUE IF NOT EXISTS 'kale';
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_crop_varieties_crop_type" 
      ADD VALUE IF NOT EXISTS 'lettuce';
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_crop_varieties_crop_type" 
      ADD VALUE IF NOT EXISTS 'pepper';
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_crop_varieties_crop_type" 
      ADD VALUE IF NOT EXISTS 'cucumber';
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_crop_varieties_crop_type" 
      ADD VALUE IF NOT EXISTS 'squash';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values easily
    // This would require recreating the enum type and updating all references
    console.log('Reverting crop type enum changes is complex and not implemented');
  }
}; 