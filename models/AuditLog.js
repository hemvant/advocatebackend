'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../utils/db');

class AuditLog extends Model {}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    user_name: { type: DataTypes.STRING(255), allowNull: true },
    user_role: { type: DataTypes.STRING(50), allowNull: true },
    module_name: { type: DataTypes.STRING(100), allowNull: true },
    action_summary: { type: DataTypes.TEXT, allowNull: true },
    user_agent: { type: DataTypes.STRING(500), allowNull: true },
    log_hash: { type: DataTypes.STRING(64), allowNull: true },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    action_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    old_value: {
      type: DataTypes.JSON, // change to TEXT('long') if using MariaDB
      allowNull: true
    },
    new_value: {
      type: DataTypes.JSON, // change to TEXT('long') if using MariaDB
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
);

module.exports = AuditLog;