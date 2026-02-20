const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const CourtWorkingDay = sequelize.define('CourtWorkingDay', {
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
  weekday: {
    type: DataTypes.ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'),
    allowNull: false
  },
  is_working: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'court_working_days',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = CourtWorkingDay;
