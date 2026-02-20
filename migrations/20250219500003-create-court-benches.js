'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('court_benches', {
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
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('court_benches', ['court_id'], { name: 'court_benches_court_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('court_benches');
  }
};
