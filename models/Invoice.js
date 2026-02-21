const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false },
  subscription_id: { type: DataTypes.INTEGER, allowNull: true },
  package_id: { type: DataTypes.INTEGER, allowNull: true },
  billing_cycle: { type: DataTypes.STRING(20), allowNull: true },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'INR' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PENDING' },
  period_start: { type: DataTypes.DATEONLY, allowNull: true },
  period_end: { type: DataTypes.DATEONLY, allowNull: true },
  due_date: { type: DataTypes.DATEONLY, allowNull: true },
  paid_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'invoices',
  timestamps: true,
  underscored: true
});

module.exports = Invoice;
