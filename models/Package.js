const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Package = sequelize.define('Package', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price_monthly: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  price_annual: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  annual_discount_percent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0
  },
  employee_limit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  duration_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30
  },
  is_demo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  ai_monthly_token_limit: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  ai_features: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const v = this.getDataValue('ai_features');
      if (v == null || v === '') return [];
      try { return JSON.parse(v); } catch (e) { return []; }
    },
    set(val) {
      this.setDataValue('ai_features', Array.isArray(val) ? JSON.stringify(val) : (val != null ? String(val) : null));
    }
  }
}, {
  tableName: 'packages',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Package;
