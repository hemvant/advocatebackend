const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  subscription_plan: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'firm'
  },
  is_system_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_trial: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  trial_ends_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  logo_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  gstin: { type: DataTypes.STRING(20), allowNull: true },
  upi_id: { type: DataTypes.STRING(100), allowNull: true }
}, {
  tableName: 'organizations',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Organization;
