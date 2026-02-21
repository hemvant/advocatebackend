const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const BILLING_CYCLES = ['MONTHLY', 'ANNUAL'];

const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false },
  package_id: { type: DataTypes.INTEGER, allowNull: true },
  plan: { type: DataTypes.STRING(100), allowNull: false },
  billing_cycle: { type: DataTypes.STRING(20), allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
  started_at: { type: DataTypes.DATE, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'subscriptions', timestamps: true, underscored: true });

Subscription.BILLING_CYCLES = BILLING_CYCLES;
module.exports = Subscription;
