const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const CourtType = sequelize.define('CourtType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.ENUM('DISTRICT', 'HIGH_COURT', 'SUPREME_COURT', 'TRIBUNAL', 'CONSUMER_FORUM', 'OTHER'),
    allowNull: false
  }
}, {
  tableName: 'court_types',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = CourtType;
