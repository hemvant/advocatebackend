'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('judges', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      organization_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      designation: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('judges', ['organization_id'], { name: 'judges_organization_id_idx' });
    await queryInterface.addIndex('judges', ['court_id'], { name: 'judges_court_id_idx' });
    await queryInterface.addIndex('judges', ['bench_id'], { name: 'judges_bench_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('judges');
  }
};
