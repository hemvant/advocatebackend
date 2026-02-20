const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const CourtBench = sequelize.define('CourtBench', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  court_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'courts', key: 'id' }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'court_benches',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = CourtBench;
