'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('court_working_days', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      court_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'courts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      weekday: {
        type: Sequelize.ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'),
        allowNull: false
      },
      is_working: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('court_working_days', ['court_id'], { name: 'court_working_days_court_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('court_working_days');
  }
};
