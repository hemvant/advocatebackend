'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('cases', ['organization_id', 'is_deleted', 'created_at'], { name: 'cases_org_deleted_created_idx' });
    await queryInterface.addIndex('cases', ['organization_id', 'is_deleted', 'status'], { name: 'cases_org_deleted_status_idx' });
    await queryInterface.addIndex('audit_logs', ['organization_id', 'created_at'], { name: 'audit_logs_org_created_idx' });
    await queryInterface.addIndex('case_hearings', ['hearing_date', 'status'], { name: 'case_hearings_date_status_idx' });
    await queryInterface.addIndex('case_tasks', ['assigned_to', 'status', 'due_date'], { name: 'case_tasks_assignee_status_due_idx' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('cases', 'cases_org_deleted_created_idx');
    await queryInterface.removeIndex('cases', 'cases_org_deleted_status_idx');
    await queryInterface.removeIndex('audit_logs', 'audit_logs_org_created_idx');
    await queryInterface.removeIndex('case_hearings', 'case_hearings_date_status_idx');
    await queryInterface.removeIndex('case_tasks', 'case_tasks_assignee_status_due_idx');
  }
};
