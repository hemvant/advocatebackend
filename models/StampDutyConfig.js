const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const StampDutyConfig = sequelize.define('StampDutyConfig', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'organizations', key: 'id' } },
  state: { type: DataTypes.STRING(100), allowNull: false },
  document_type: { type: DataTypes.STRING(50), allowNull: false },
  rate_type: { type: DataTypes.ENUM('PERCENTAGE', 'FIXED'), allowNull: false, defaultValue: 'FIXED' },
  rate_value: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  min_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  max_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true }
}, {
  tableName: 'stamp_duty_config',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = StampDutyConfig;
