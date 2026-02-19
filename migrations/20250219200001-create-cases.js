'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cases', {
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
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'clients', key: 'id' },
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
      case_title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      case_number: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      court_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      case_type: {
        type: Sequelize.ENUM('CIVIL', 'CRIMINAL', 'CORPORATE', 'TAX', 'FAMILY', 'OTHER'),
        allowNull: false,
        defaultValue: 'OTHER'
      },
      status: {
        type: Sequelize.ENUM('DRAFT', 'FILED', 'HEARING', 'ARGUMENT', 'JUDGMENT', 'CLOSED'),
        allowNull: false,
        defaultValue: 'DRAFT'
      },
      priority: {
        type: Sequelize.ENUM('LOW', 'MEDIUM', 'HIGH'),
        allowNull: false,
        defaultValue: 'MEDIUM'
      },
      filing_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      next_hearing_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      description: {
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
    await queryInterface.addIndex('cases', ['organization_id'], { name: 'cases_organization_id_idx' });
    await queryInterface.addIndex('cases', ['client_id'], { name: 'cases_client_id_idx' });
    await queryInterface.addIndex('cases', ['assigned_to'], { name: 'cases_assigned_to_idx' });
    await queryInterface.addIndex('cases', ['case_number'], { name: 'cases_case_number_idx' });
    await queryInterface.addIndex('cases', ['status'], { name: 'cases_status_idx' });
    await queryInterface.addIndex('cases', ['organization_id', 'case_number'], { unique: true, name: 'cases_org_case_number_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cases');
  }
};
