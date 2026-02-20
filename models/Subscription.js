const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');
const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false },
  plan: { type: DataTypes.STRING(100), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
  started_at: { type: DataTypes.DATE, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'subscriptions', timestamps: true, underscored: true });
module.exports = Subscription;
