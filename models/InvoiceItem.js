const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const InvoiceItem = sequelize.define('InvoiceItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false },
  invoice_id: { type: DataTypes.INTEGER, allowNull: false },
  description: { type: DataTypes.STRING(500), allowNull: true },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
  unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }
}, {
  tableName: 'invoice_items',
  timestamps: true,
  underscored: true
});

module.exports = InvoiceItem;
