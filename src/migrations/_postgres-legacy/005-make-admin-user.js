module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Set role='admin' for the most recently created admin@gmail.com user
    await queryInterface.sequelize.query(`
      UPDATE "users"
      SET "role" = 'admin'
      WHERE "email" = 'admin@gmail.com'
      AND "created_at" = (
        SELECT MAX("created_at") FROM "users" WHERE "email" = 'admin@gmail.com'
      );
    `);
  },
  down: async (queryInterface, Sequelize) => {
    // Optionally revert the role for the most recent admin@gmail.com user
    await queryInterface.sequelize.query(`
      UPDATE "users"
      SET "role" = 'user'
      WHERE "email" = 'admin@gmail.com'
      AND "created_at" = (
        SELECT MAX("created_at") FROM "users" WHERE "email" = 'admin@gmail.com'
      );
    `);
  }
}; 