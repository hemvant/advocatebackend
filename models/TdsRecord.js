const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const TdsRecord = sequelize.define('TdsRecord', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false },
  invoice_id: { type: DataTypes.INTEGER, allowNull: true },
  payment_id: { type: DataTypes.INTEGER, allowNull: true },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  tds_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  tds_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  financial_year: { type: DataTypes.STRING(9), allowNull: true },
  deduction_date: { type: DataTypes.DATEONLY, allowNull: true }
}, {
  tableName: 'tds_records',
  timestamps: true,
  underscored: true
});

module.exports = TdsRecord;
