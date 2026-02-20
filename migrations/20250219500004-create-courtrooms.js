'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('courtrooms', {
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
      bench_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'court_benches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      room_number: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      floor: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('courtrooms', ['court_id'], { name: 'courtrooms_court_id_idx' });
    await queryInterface.addIndex('courtrooms', ['bench_id'], { name: 'courtrooms_bench_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('courtrooms');
  }
};
