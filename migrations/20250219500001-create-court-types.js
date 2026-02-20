'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('court_types', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.ENUM('DISTRICT', 'HIGH_COURT', 'SUPREME_COURT', 'TRIBUNAL', 'CONSUMER_FORUM', 'OTHER'),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.sequelize.query(`
      INSERT INTO court_types (name) VALUES ('DISTRICT'), ('HIGH_COURT'), ('SUPREME_COURT'), ('TRIBUNAL'), ('CONSUMER_FORUM'), ('OTHER')
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('court_types');
  }
};
