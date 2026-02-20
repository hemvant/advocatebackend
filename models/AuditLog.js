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