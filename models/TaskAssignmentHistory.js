const { DataTypes } = require("sequelize");
const { sequelize } = require("../utils/db");

const TaskAssignmentHistory = sequelize.define("TaskAssignmentHistory", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "organizations", key: "id" } },
  task_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "case_tasks", key: "id" } },
  previous_assigned_to: { type: DataTypes.INTEGER, allowNull: true, references: { model: "organization_users", key: "id" } },
  new_assigned_to: { type: DataTypes.INTEGER, allowNull: false, references: { model: "organization_users", key: "id" } },
  changed_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: "organization_users", key: "id" } },
  change_reason: { type: DataTypes.STRING(500), allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: "task_assignment_history",
  timestamps: false,
  underscored: true
});

module.exports = TaskAssignmentHistory;
