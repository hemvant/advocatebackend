'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      organization_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'organization_users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },

      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },

      entity_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      action_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },

      // 🔥 Changed from JSON to LONGTEXT (MariaDB compatible)
      old_value: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },

      new_value: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },

      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }

    });

    // Indexes
    await queryInterface.addIndex('audit_logs', ['organization_id']);
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['entity_type']);
    await queryInterface.addIndex('audit_logs', ['action_type']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  }
};