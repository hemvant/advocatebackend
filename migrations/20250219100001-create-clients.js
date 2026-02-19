'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('clients', {
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
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      assigned_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      category: {
        type: Sequelize.ENUM('INDIVIDUAL', 'CORPORATE', 'GOVERNMENT', 'VIP'),
        allowNull: false,
        defaultValue: 'INDIVIDUAL'
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'CLOSED', 'BLACKLISTED'),
        allowNull: false,
        defaultValue: 'ACTIVE'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
    await queryInterface.addIndex('clients', ['organization_id'], { name: 'clients_organization_id_idx' });
    await queryInterface.addIndex('clients', ['created_by'], { name: 'clients_created_by_idx' });
    await queryInterface.addIndex('clients', ['assigned_to'], { name: 'clients_assigned_to_idx' });
    await queryInterface.addIndex('clients', ['name'], { name: 'clients_name_idx' });
    await queryInterface.addIndex('clients', ['email'], { name: 'clients_email_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('clients');
  }
};
