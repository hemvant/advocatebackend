const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Expense = sequelize.define('Expense', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false },
  case_id: { type: DataTypes.INTEGER, allowNull: true },
  category: { type: DataTypes.STRING(100), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  expense_date: { type: DataTypes.DATEONLY, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  receipt_path: { type: DataTypes.STRING(500), allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'expenses',
  timestamps: true,
  underscored: true
});

module.exports = Expense;
