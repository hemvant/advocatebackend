const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Judge = sequelize.define('Judge', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'organizations', key: 'id' }
  },
  court_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'courts', key: 'id' }
  },
  bench_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'court_benches', key: 'id' }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  designation: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'judges',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Judge;
