const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false },
  invoice_id: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  payment_date: { type: DataTypes.DATEONLY, allowNull: true },
  transaction_id: { type: DataTypes.STRING(100), allowNull: true },
  upi_reference_id: { type: DataTypes.STRING(100), allowNull: true },
  method: { type: DataTypes.STRING(30), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'payments',
  timestamps: true,
  underscored: true
});

module.exports = Payment;
