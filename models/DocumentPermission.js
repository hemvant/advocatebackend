const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const DocumentPermission = sequelize.define('DocumentPermission', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  document_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'case_documents', key: 'id' } },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'organization_users', key: 'id' } },
  permission: { type: DataTypes.STRING(20), allowNull: false }
}, {
  tableName: 'document_permissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = DocumentPermission;
