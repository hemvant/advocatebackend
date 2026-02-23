'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const caseTable = await queryInterface.describeTable('cases');
    if (!caseTable.assigned_at) {
      await queryInterface.addColumn('cases', 'assigned_at', { type: Sequelize.DATE, allowNull: true });
    }
    if (!caseTable.assigned_by) {
      await queryInterface.addColumn('cases', 'assigned_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    await queryInterface.createTable('case_assignment_changes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      case_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'cases', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      previous_assigned_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      new_assigned_to: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      changed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      change_reason: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('case_assignment_changes', ['organization_id'], { name: 'case_assignment_changes_org_idx' });
    await queryInterface.addIndex('case_assignment_changes', ['case_id'], { name: 'case_assignment_changes_case_idx' });
    await queryInterface.addIndex('case_assignment_changes', ['created_at'], { name: 'case_assignment_changes_created_idx' });

    const taskTable = await queryInterface.describeTable('case_tasks');
    if (!taskTable.assigned_by) {
      await queryInterface.addColumn('case_tasks', 'assigned_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    await queryInterface.createTable('task_assignment_history', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      task_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'case_tasks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      previous_assigned_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      new_assigned_to: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      changed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      change_reason: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('task_assignment_history', ['organization_id'], { name: 'task_assignment_history_org_idx' });
    await queryInterface.addIndex('task_assignment_history', ['task_id'], { name: 'task_assignment_history_task_idx' });
    await queryInterface.addIndex('task_assignment_history', ['created_at'], { name: 'task_assignment_history_created_idx' });

    await queryInterface.createTable('case_activity_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      case_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'cases', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      task_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'case_tasks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      activity_type: {
        type: Sequelize.ENUM(
          'CASE_CREATED', 'CASE_UPDATED', 'CASE_ASSIGNED', 'CASE_REASSIGNED',
          'TASK_CREATED', 'TASK_UPDATED', 'TASK_ASSIGNED', 'TASK_REASSIGNED',
          'TASK_STARTED', 'TASK_COMPLETED', 'STATUS_CHANGED'
        ),
        allowNull: false
      },
      activity_summary: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('case_activity_logs', ['organization_id'], { name: 'case_activity_logs_org_idx' });
    await queryInterface.addIndex('case_activity_logs', ['case_id'], { name: 'case_activity_logs_case_idx' });
    await queryInterface.addIndex('case_activity_logs', ['user_id'], { name: 'case_activity_logs_user_idx' });
    await queryInterface.addIndex('case_activity_logs', ['created_at'], { name: 'case_activity_logs_created_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('case_activity_logs');
    await queryInterface.dropTable('task_assignment_history');
    try {
      await queryInterface.removeColumn('case_tasks', 'assigned_by');
    } catch (_) {}
    await queryInterface.dropTable('case_assignment_changes');
    try {
      await queryInterface.removeColumn('cases', 'assigned_at');
      await queryInterface.removeColumn('cases', 'assigned_by');
    } catch (_) {}
  }
};
