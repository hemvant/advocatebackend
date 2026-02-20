'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('courts', {
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
      court_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'court_types', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
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
    await queryInterface.addIndex('courts', ['organization_id'], { name: 'courts_organization_id_idx' });
    await queryInterface.addIndex('courts', ['court_type_id'], { name: 'courts_court_type_id_idx' });
    await queryInterface.addIndex('courts', ['is_active'], { name: 'courts_is_active_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('courts');
  }
};
