const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false },
  subscription_id: { type: DataTypes.INTEGER, allowNull: true },
  package_id: { type: DataTypes.INTEGER, allowNull: true },
  case_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'cases', key: 'id' } },
  billing_cycle: { type: DataTypes.STRING(20), allowNull: true },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'INR' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PENDING' },
  period_start: { type: DataTypes.DATEONLY, allowNull: true },
  period_end: { type: DataTypes.DATEONLY, allowNull: true },
  due_date: { type: DataTypes.DATEONLY, allowNull: true },
  paid_at: { type: DataTypes.DATE, allowNull: true },
  gateway_order_id: { type: DataTypes.STRING(100), allowNull: true },
  payment_id: { type: DataTypes.STRING(100), allowNull: true },
  transaction_id: { type: DataTypes.STRING(100), allowNull: true },
  payment_reminder_sent_at: { type: DataTypes.DATE, allowNull: true },
  professional_fee: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
  filing_fee: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
  clerk_fee: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
  court_fee: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
  misc_expense: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
  advance_received: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
  gst_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  gst_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
  gst_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
  total_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  balance_due: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  invoice_number: { type: DataTypes.STRING(50), allowNull: true },
  gstin: { type: DataTypes.STRING(20), allowNull: true },
  cgst_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  sgst_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  igst_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  payment_date: { type: DataTypes.DATEONLY, allowNull: true },
  upi_reference_id: { type: DataTypes.STRING(100), allowNull: true }
}, {
  tableName: 'invoices',
  timestamps: true,
  underscored: true
});

module.exports = Invoice;
